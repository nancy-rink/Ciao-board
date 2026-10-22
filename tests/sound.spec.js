const {test,expect}=require('@playwright/test');
const {device,sendMessage,noErrors}=require('./helpers');

// Taps everything the board sends to the speakers, so the test can check that sound really comes out
const tap=()=>{
  window.__level=0;
  const orig=AudioNode.prototype.connect;
  AudioNode.prototype.connect=function(d,...a){
    if(d instanceof AudioDestinationNode){const c=this.context;
      if(!c.__tap){const sp=c.createScriptProcessor(2048,2,2);sp.onaudioprocess=e=>{const x=e.inputBuffer.getChannelData(0);let s=0;for(const v of x)s+=v*v;window.__level+=s};orig.call(sp,d);c.__tap=sp}
      return orig.call(this,c.__tap,...a)}
    return orig.call(this,d,...a)};
};
test.use({launchOptions:{args:['--autoplay-policy=no-user-gesture-required']}});

test('flaps, chimes and backgrounds all make sound',async({browser})=>{
  const page=await device(browser); await page.context().addInitScript(tap);
  await page.goto('/'); await page.mouse.click(5,5);
  const level=()=>page.evaluate(()=>{const l=window.__level;window.__level=0;return l});
  const pick=(id,v)=>page.evaluate(([i,v])=>{const s=document.getElementById(i);s.value=v;s.dispatchEvent(new Event('change'))},[id,v]);
  await pick('chimeStyle','none'); await level();
  for(const style of ['solari','cifra','ikarus','zsolnay']){
    await page.evaluate(i=>{const b=document.querySelector('.swatch[data-id="'+i+'"] .sw-main');b.click();b.click()},style);
    await sendMessage(page,'SOUND CHECK '+style); await page.waitForTimeout(2500);
    expect(await level(),style+' flaps').toBeGreaterThan(0.01);
  }
  for(const c of ['arrival','vibes','tubular','two']){await pick('chimeStyle',c);await page.waitForTimeout(1200);expect(await level(),c+' chime').toBeGreaterThan(0.01)}
  for(const a of ['hall','rain','cafe','room']){await pick('sndAmb',a);await page.waitForTimeout(2500);expect(await level(),a+' background').toBeGreaterThan(0.001)}
  await pick('sndAmb','off'); await pick('sndRoom','hall'); await pick('sndRoom','off');
  noErrors(page);
});
