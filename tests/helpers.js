const {expect}=require('@playwright/test');
const RELAY='http://127.0.0.1:8790/', CF='http://127.0.0.1:8792/';
// A device: its own browser storage, pointed at the local relays, collecting page errors.
// relay: the ntfy.sh stand-in; cf: our own relay ('' for a board from before it existed); noStream: no live connections at all.
async function device(browser,{width=1280,height=900,phone=false,relay=RELAY,cf=CF,storage,noStream=false}={}){
  const ctx=await browser.newContext({viewport:{width,height},isMobile:phone,hasTouch:phone});
  await ctx.addInitScript(([r,c])=>{window.__ciaoNtfy=r;window.__ciaoRelay=c},[relay,cf]);
  if(storage)await ctx.addInitScript(s=>{if(!sessionStorage.getItem('seeded')){for(const[k,v]of Object.entries(s))localStorage.setItem(k,v);sessionStorage.setItem('seeded','1')}},storage);
  if(noStream){await ctx.route(/\/sse/,r=>r.abort());await ctx.routeWebSocket(/\/ws/,ws=>ws.close())}
  const page=await ctx.newPage();
  page.errors=[]; page.on('pageerror',e=>page.errors.push(e.message));
  return page;
}
const stored=(page,key)=>page.evaluate(k=>JSON.parse(localStorage.getItem('beta2.fb.'+k)||'null'),key);
const snd=async page=>(await stored(page,'snd'))||{};
async function openCard(page,tab){if(await page.isHidden('#sheet'))await page.click('#showOpen');await page.click('.card[data-tab="'+tab+'"]')}
async function sendMessage(page,text){await openCard(page,'message');await page.fill('#msgBox',text);await page.click('#sendBtn')}
// The TV start screen's pairing code, digits only
async function tvCode(tv){await tv.waitForSelector('#tvPairBox:not([hidden]) #tvCode');return (await tv.textContent('#tvCode')).replace(/\D/g,'')}
// A TV and a phone remote paired through the start screen's code
async function pairedTvAndPhone(browser,opts={}){
  const tv=await device(browser,{width:1920,height:1080,...opts.tv});
  await tv.goto('?tv');
  const code=await tvCode(tv);
  const phone=await device(browser,{width:390,height:844,phone:true,...opts.phone});
  await phone.goto('?remote#pair='+code);
  await expect(phone.locator('#raMain')).toBeVisible({timeout:40e3});
  await expect(phone.locator('#raState')).toContainText('·');
  return {tv,phone,code};
}
const noErrors=(...pages)=>pages.forEach(p=>expect(p.errors,'page errors').toEqual([]));
module.exports={device,stored,snd,openCard,sendMessage,tvCode,pairedTvAndPhone,noErrors,RELAY,CF};
