const {test,expect}=require('@playwright/test');
const {device,stored,snd,tvCode,pairedTvAndPhone,noErrors}=require('./helpers');
const relay=require('./relay');

test('the phone remote pairs from the QR link and controls the TV',async({browser})=>{
  const {tv,phone}=await pairedTvAndPhone(browser);
  await expect(tv.locator('#tvStart')).toBeHidden();                       // the start screen closes once a phone connects
  expect((await stored(tv,'friends')).links[0].cf).toBe(true);             // both ends moved the link to our relay
  expect((await stored(phone,'friends')).links[0].cf).toBe(true);

  await phone.click('[data-ra="clock"]');
  await expect(phone.locator('#raState')).toContainText('the clock');
  await phone.click('[data-ra="news"]');
  await expect(phone.locator('#raNewsChips button')).toHaveCount(7);
  await phone.click('#raNewsChips button:nth-child(2)');
  await expect(phone.locator('#raState')).toContainText('BBC headlines');
  await phone.click('[data-ra="art"]'); await phone.click('#raArtChips button:nth-child(1)');
  await expect(phone.locator('#raState')).toContainText('Art: Heart');
  await phone.fill('#raMsg','Hola from the couch'); await phone.click('#raSend');
  await expect(phone.locator('#raState')).toContainText('HOLA FROM THE COUCH');

  const id=await phone.$eval('#raStyles button:nth-child(4)',b=>b.dataset.id);
  await phone.click('#raStyles button:nth-child(4)');
  await expect(tv.locator('#board')).toHaveAttribute('data-style',id);
  await expect(phone.locator('#raStyles button:not([hidden])')).toHaveCount(6);  // only the open group shows: Everyday
  await phone.click('#raGroups button[data-g="museum"]');
  await expect(phone.locator('#raStyles button[data-id="william"]')).toBeVisible();
  await expect(phone.locator('#raStyles button[data-id="classic"]')).toBeHidden();
  await phone.click('#raStyles button[data-id="william"]');
  await expect(tv.locator('#board')).toHaveAttribute('data-style','william');
  await expect(phone.locator('#raStyleName')).toHaveText('William');
  await phone.click('#raNext');                                                  // › steps the TV to the next style
  await expect(tv.locator('#board')).not.toHaveAttribute('data-style','william');
  await expect(phone.locator('#raStyleName')).not.toHaveText('William');

  const before=(await snd(tv)).vol??0.7;                 // a fresh TV hasn't saved its sound settings yet
  await phone.click('#raVolDown'); await phone.click('#raVolDown');          // quick taps go out as one command
  await expect.poll(async()=>(await snd(tv)).vol).toBeCloseTo(before-.2,5);
  await expect(phone.locator('#raVolOut')).toHaveText(Math.round((before-.2)*100)+'%');
  await phone.click('#raMute');
  await expect.poll(async()=>(await snd(tv)).on).toBe(false);
  await phone.click('details.ra-more summary'); await phone.selectOption('#raAmb','rain');
  await expect.poll(async()=>(await snd(tv)).ambient).toBe('rain');
  noErrors(tv,phone);
});

test('typing the 6 digits connects without another tap',async({browser})=>{
  const tv=await device(browser,{width:1920,height:1080}); await tv.goto('?tv'); const code=await tvCode(tv);
  const phone=await device(browser,{width:390,height:844,phone:true}); await phone.goto('remote/');
  await expect(phone.locator('#raCode')).toHaveAttribute('inputmode','numeric');
  await phone.locator('#raCode').pressSequentially(code,{delay:60});
  await expect(phone.locator('#raMain')).toBeVisible({timeout:40e3});
  noErrors(tv,phone);
});

test('pairing finishes even when the live stream is blocked',async({browser})=>{
  const {tv,phone}=await pairedTvAndPhone(browser,{tv:{noStream:true},phone:{noStream:true}});
  await phone.click('[data-ra="clock"]'); await expect(phone.locator('#raState')).toContainText('the clock',{timeout:40e3});
  noErrors(tv,phone);
});

test('a TV that was off reconnects by itself; a forgotten one can be paired again',async({browser})=>{
  const {tv,phone}=await pairedTvAndPhone(browser);
  const tvCtx=tv.context(); await tv.close();
  await phone.click('[data-ra="clock"]');
  await expect(phone.locator('#raStale')).toBeVisible({timeout:45e3});
  await expect(phone.locator('#raStale')).toContainText('reconnects by itself');

  const back=await tvCtx.newPage(); await back.goto('?tv');                 // the TV comes back on
  await expect(phone.locator('#raStale')).toBeHidden({timeout:30e3});

  await back.evaluate(()=>localStorage.clear()); await back.reload();         // now the TV really forgets
  const code=await tvCode(back);
  await phone.click('[data-ra="clear"]');
  await expect(phone.locator('#raStale')).toBeVisible({timeout:45e3});
  await phone.click('#raRepair'); await phone.fill('#raCode',code);
  await expect(phone.locator('#raMain')).toBeVisible({timeout:40e3});
  await expect(phone.locator('#raStale')).toBeHidden();
  expect((await stored(phone,'friends')).links.filter(l=>l.kind==='tv')).toHaveLength(1); // the new pairing replaces the old
  noErrors(phone);
});

test('the TV start screen keeps its code across reloads and makes a new one once used',async({browser})=>{
  const tv=await device(browser,{width:1920,height:1080}); await tv.goto('?tv');
  const first=await tvCode(tv); await tv.reload(); expect(await tvCode(tv)).toBe(first);
  const phone=await device(browser,{width:390,height:844,phone:true}); await phone.goto('?remote#pair='+first);
  await expect(phone.locator('#raMain')).toBeVisible({timeout:40e3});
  await tv.reload(); expect(await tvCode(tv)).not.toBe(first);
});

test('the TV says so when the relay\'s daily limit is used up',async({browser})=>{
  const server=await relay.start(8791,{limit:0});
  try{
    const tv=await device(browser,{width:1920,height:1080,relay:'http://127.0.0.1:8791/',cf:''}); await tv.goto('?tv');
    await expect(tv.locator('#tvPairBox')).toContainText('daily message limit');
  }finally{server.close()}
});

test('the remote fits phone widths from 320 to 430',async({browser})=>{
  const {phone}=await pairedTvAndPhone(browser);
  await phone.click('[data-ra="news"]'); await phone.click('details.ra-more summary');
  for(const w of [320,360,375,390,430]){
    await phone.setViewportSize({width:w,height:900});
    expect(await phone.evaluate(()=>document.documentElement.scrollWidth-innerWidth),'sideways scroll at '+w).toBeLessThanOrEqual(0);
    const overlaps=await phone.evaluate(()=>{ // sibling sections in the remote must not overlap
      const kids=[...document.querySelectorAll('#raMain > :not([hidden])')].map(e=>e.getBoundingClientRect()).filter(r=>r.height);
      return kids.slice(1).filter((r,i)=>r.top<kids[i].bottom-1).length});
    expect(overlaps,'overlapping sections at '+w).toBe(0);
  }
});

test('with ntfy.sh refusing everything, the remote pairs and works over our relay',async({browser})=>{
  const server=await relay.start(8793,{limit:0});
  try{
    const ntfy='http://127.0.0.1:8793/';
    const {tv,phone}=await pairedTvAndPhone(browser,{tv:{relay:ntfy},phone:{relay:ntfy}});
    await phone.click('[data-ra="clock"]'); await expect(phone.locator('#raState')).toContainText('the clock');
    expect((await stored(tv,'friends')).links[0].cf).toBe(true);
    expect((await stored(phone,'friends')).links[0].cf).toBe(true);
    noErrors(tv,phone);
  }finally{server.close()}
});

test('a board from before our relay still pairs with an updated one, over ntfy.sh',async({browser})=>{
  const {tv,phone}=await pairedTvAndPhone(browser,{phone:{cf:''}});
  await phone.click('[data-ra="clock"]'); await expect(phone.locator('#raState')).toContainText('the clock');
  expect((await stored(tv,'friends')).links[0].cf).toBeFalsy();               // the TV keeps that link on ntfy.sh
  noErrors(tv,phone);
});
