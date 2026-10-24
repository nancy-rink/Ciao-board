const {test,expect}=require('@playwright/test');
const {device,stored,sendMessage,noErrors}=require('./helpers');

test('a message flips onto the board, with accents and fallbacks',async({browser})=>{
  const page=await device(browser); await page.goto('/');
  await sendMessage(page,'Szia Budapest\nŐRÖK ÜRÜGY\nŁódź · Černý');
  await expect(page.locator('#boardText')).toContainText('SZIA BUDAPEST',{timeout:30e3});
  await expect(page.locator('#boardText')).toContainText('ŐRÖK ÜRÜGY');   // Hungarian letters have their own flaps
  await expect(page.locator('#boardText')).toContainText('LÓDZ');         // Ł and Ź fall back to the plain letter
  await expect(page.locator('#boardText')).toContainText('CERNY');
  noErrors(page);
});

test('full screen on a phone is easy to leave: the faded Exit still works, and so does a double-tap',async({browser})=>{
  const page=await device(browser,{width:844,height:390,phone:true}); await page.goto('/');
  const fs=()=>page.evaluate(()=>document.body.classList.contains('fs'));
  await page.tap('#fsBtn'); expect(await fs()).toBe(true);
  await expect(page.locator('#fsNote')).toContainText('Double-tap');
  await expect(page.locator('body')).toHaveClass(/idle/,{timeout:8000});  // the Exit button fades
  await page.tap('#fsExit',{force:true}); expect(await fs()).toBe(false);  // and one tap still leaves
  await page.tap('#fsBtn'); expect(await fs()).toBe(true);
  const b=await page.locator('#board').boundingBox(), x=b.x+b.width/2, y=b.y+b.height/2;
  await Promise.all([page.touchscreen.tap(x,y),page.touchscreen.tap(x,y)]);  // sent back to back, as a real double-tap is
  await expect.poll(fs).toBe(false);
  noErrors(page);
});

test('the book channel reads a chapter through the day, and the next one tomorrow',async({browser})=>{
  const page=await device(browser);
  await page.clock.install({time:new Date('2026-10-24T08:30:00')});
  await page.goto('/');
  await page.click('#tab-show'); await page.click('.chan[data-id="book"] .chan-opts');
  await page.click('#bookBtn');
  await expect(page.locator('#bookStatus')).toContainText(/Chapter 1, Loomings · page \d+ of \d+/);
  const pg=async()=>+(await page.textContent('#bookStatus')).match(/page (\d+)/)[1];
  const first=await pg();
  await page.clock.fastForward('04:00:00');
  await expect.poll(pg,{timeout:30000}).toBeGreaterThan(first);                 // pages turn through the day
  await page.clock.fastForward('21:00:00');                                     // the next morning, 9:30
  await expect(page.locator('#bookStatus')).toContainText('Chapter 2',{timeout:30000});
  expect(await stored(page,'mode')).toBe('book');
  await page.selectOption('#bookWhich','frank');                                // another book starts at its beginning
  await expect(page.locator('#bookStatus')).toContainText('Frankenstein · Letter 1',{timeout:30000});
  await page.selectOption('#bookWhich','moby');                                 // and Moby-Dick picks up where it was
  await expect(page.locator('#bookStatus')).toContainText('Moby-Dick · Chapter 2',{timeout:30000});
  noErrors(page);
});

test('the word of the day: every word fits the board, in English and French',async({browser})=>{
  const page=await device(browser);
  await page.clock.install({time:new Date('2026-10-24T09:00:00')});
  await page.goto('/');
  await page.click('#tab-show'); await page.click('.chan[data-id="word"] .chan-opts');
  for(const lang of ['en','fr']){
    await page.selectOption('#wordLang',lang);
    const bad=await page.evaluate(async()=>{const l=await wordLoad();const out=[];
      l.forEach(e=>{const pages=[WORD_LANG[word.lang].head+'\n\n'+e.w+'\n'+e.pos,e.def,'"'+e.ex+'"'].concat(e.tr?['IN ENGLISH:\n"'+e.tr+'"']:[]);
        pages.forEach(p=>{const s=p.replace(/\{[a-z]\}/g,'').replace(/\n/g,' ').normalize('NFC'),t=tokenize(s);if(layout(p).length>ROWS||t.some((c,i)=>c===' '&&s[i]!==' '))out.push(e.w+': '+p)})});return out});
    expect(bad).toEqual([]);                                                    // nothing too long, no letter the board lacks
  }
  await page.click('#wordBtn');
  await expect(page.locator('#wordStatus')).toContainText('Today’s French word:');
  const w=await page.evaluate(()=>wordEntry().w);
  await page.clock.fastForward('24:00:00');                                     // a new word the next day
  await page.selectOption('#wordLang','fr');
  await expect.poll(()=>page.evaluate(()=>wordEntry().w)).not.toBe(w);
  expect(await stored(page,'mode')).toBe('word');
  noErrors(page);
});

test('display styles change letters in place, even in Smooth mode, and leave nothing behind',async({browser})=>{
  const page=await device(browser); await page.goto('/');
  await page.evaluate(()=>{anim.perf='smooth';applyAnim();send('CLASSIC FIRST\n{w}{w}{w}')});
  await page.waitForTimeout(400);                                               // switch partway through the flips
  for(const id of ['nixie','marquee','letterboard','letterpress','stitch','flipdot','scrabble','labeltape']){
    await page.evaluate(i=>{applyStyle(i);send('HELLO '+i.toUpperCase())},id);
    await expect.poll(()=>page.evaluate(()=>!busy)).toBe(true);
    const r=await page.evaluate(()=>({canvas:document.getElementById('grid').classList.contains('canvas'),
      flaps:[...document.querySelectorAll('#grid .f,#grid .g')].some(e=>getComputedStyle(e).display!=='none'),
      stray:tiles.filter(t=>t.u.firstChild.textContent!==t.d.firstChild.textContent||t.u.style.background!==t.d.style.background).length}));
    expect(r,id).toEqual({canvas:false,flaps:false,stray:0});
  }
  noErrors(page);
});

test('no sideways scroll on a phone',async({browser})=>{
  const page=await device(browser,{width:360,height:780,phone:true}); await page.goto('/');
  await page.waitForTimeout(800);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(0);
  noErrors(page);
});

test('TV mode shows the start screen with a 6-digit pairing code',async({browser})=>{
  const tv=await device(browser,{width:1920,height:1080}); await tv.goto('?tv');
  await expect(tv.locator('#tvStart')).toBeVisible();
  await expect(tv.locator('#tvCode')).toHaveText(/^\d{3} \d{3}$/);
  await expect(tv.locator('#tvQr svg')).toBeVisible();
  await tv.click('#tvGo'); await expect(tv.locator('#tvStart')).toBeHidden();
  expect(await tv.evaluate(()=>document.body.classList.contains('lite'))).toBe(true); // Smooth mode on TVs
  noErrors(tv);
});

test('the /tv and /remote short paths redirect',async({browser})=>{
  const page=await device(browser);
  await page.goto('tv/'); await page.waitForURL(/\?tv$/);
  await page.goto('remote/'); await page.waitForURL(/\?remote$/);
});

test('a board on the old Worn style becomes Classic with Worn on',async({browser})=>{
  const page=await device(browser,{storage:{'beta2.fb.style':'"worn"'}}); await page.goto('/');
  expect(await stored(page,'style')).toBe('classic');
  expect(await stored(page,'aged')).toBe(true);
  await expect(page.locator('#board')).toHaveAttribute('data-aged','');
  noErrors(page);
});

test('a board on a retired style becomes Classic, and retired favorites drop out',async({browser})=>{
  const page=await device(browser,{storage:{'beta2.fb.style':'"hagia"','beta2.fb.favStyles':'["hagia","googie","jantar"]'}}); await page.goto('/');
  expect(await stored(page,'style')).toBe('classic');
  await expect(page.locator('#board')).toHaveAttribute('data-style','classic');
  expect(await page.evaluate(()=>favStyles)).toEqual(['googie']);
  noErrors(page);
});

test('loads cleanly when the scripts arrive slowly, as on a TV',async({browser})=>{
  for(const q of ['','?tv','?remote']){
    const page=await device(browser,{width:1920,height:1080});
    // each script arrives 300 ms after the one before it, so timers set by early files get a chance to fire in between
    let n=0; await page.route(/\/js\/.*\.js/,async r=>{const wait=300*(++n);await new Promise(ok=>setTimeout(ok,wait));await r.continue()});
    await page.goto(q||'/'); await page.waitForTimeout(5000);
    noErrors(page);
  }
});

test('previewing a channel keeps the board until you put it on',async({browser})=>{
  const page=await device(browser,{width:390,height:844,phone:true}); await page.goto('/');
  await sendMessage(page,'Hello there');
  await expect(page.locator('#boardText')).toContainText('HELLO THERE',{timeout:30e3});
  await page.click('#tab-show'); await page.click('#detailBack');
  // options don't change the board
  await page.click('.chan[data-id="clock"] .chan-opts'); await page.selectOption('#clkHours','24');
  expect(await stored(page,'mode')).toBe('');
  await page.click('#detailBack');
  // preview, then keep what was there
  await page.click('.chan[data-id="clock"] .chan-main');
  await expect(page.locator('#tryBar')).toBeVisible(); await expect(page.locator('#tryCancel')).toHaveText('Keep message');
  await expect(page.locator('#status')).toContainText('Previewing');
  await page.click('#tryCancel');
  await expect(page.locator('#boardText')).toContainText('HELLO THERE',{timeout:30e3});
  expect(await stored(page,'mode')).toBe('');
  // preview, then put it on
  await page.click('.chan[data-id="clock"] .chan-main'); await page.click('#tryUse');
  await expect.poll(()=>stored(page,'mode')).toBe('clock');
  await expect(page.locator('.chan[data-id="clock"]')).toHaveClass(/\bon\b/);
  noErrors(page);
});

test('the tabs: Show, Look, Connect and Settings, on a phone and a laptop',async({browser})=>{
  for(const [w,h,phone] of [[390,844,true],[1440,900,false]]){
    const page=await device(browser,{width:w,height:h,phone}); await page.goto('/');
    for(const v of ['look','connect','settings','show']){
      await page.click('#tab-'+v); await expect(page.locator('#view-'+v)).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),v+' at '+w).toBeLessThanOrEqual(0);
    }
    await expect(page.locator('#board')).toBeInViewport();
    noErrors(page);
  }
});
