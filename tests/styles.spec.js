const {test,expect}=require('@playwright/test');
const {device,stored,noErrors}=require('./helpers');

test.describe('style picker',()=>{
  test.beforeEach(async({page})=>{});
  test('try, cancel, use, double-tap, Everyday dots, favorites, filters',async({browser})=>{
    const page=await device(browser,{width:390,height:844,phone:true}); await page.goto('/');
    await page.click('#tab-look');
    const card=id=>page.locator('#styleTray .swatch[data-id="'+id+'"]:not(#sw-fav *) .sw-main');
    const open=g=>page.click('#grp-'+g+' .grp-toggle');
    await expect(page.locator('#grp-everyday')).toHaveClass(/open/);  // the board's group starts open
    await expect(card('oxblood')).toBeHidden();                       // the others start closed
    await open('wayfinding'); await open('studio'); await open('material');

    await card('oxblood').click();                                   // try
    await expect(page.locator('#board')).toHaveAttribute('data-style','oxblood');
    await expect(page.locator('#tryName')).toHaveText('Trying Oxblood');
    expect(await stored(page,'style')).toBe('classic');
    await page.click('#tryCancel');                                  // cancel
    await expect(page.locator('#board')).toHaveAttribute('data-style','classic');

    await card('standard').click(); await page.click('#tryUse');     // use
    expect(await stored(page,'style')).toBe('standard');
    await card('graphite').click(); await card('graphite').click();  // a second tap keeps it
    expect(await stored(page,'style')).toBe('graphite');

    await page.click('.sw-dots button[data-id="harbor"]'); await page.click('#tryUse');
    expect(await stored(page,'style')).toBe('harbor');
    await expect(page.locator('.swatch.family .nm2 span')).toHaveText('Everyday · Harbor');

    for(const id of ['oxblood','butterfly','kassak'])await page.locator('#styleTray .swatch[data-id="'+id+'"]:not(#sw-fav *) .sw-fav').click();
    await expect(page.locator('#sw-fav .swatch')).toHaveCount(3);
    await page.click('#tab-show'); await page.click('#status');
    const seen=[]; for(let i=0;i<4;i++){await page.keyboard.press('s');seen.push(await stored(page,'style'))}
    expect(seen).toEqual(['oxblood','butterfly','kassak','oxblood']);    // S steps through favorites

    await page.click('#tab-look'); await page.click('#trayTone button[data-tone="dark"]');
    await expect(page.locator('#styleTray .swatch[data-id="daylight"]')).toHaveCount(0); // Everyday is one card
    await expect(page.locator('#sw-studio .swatch[data-id="kassak"]')).toBeHidden();     // a light style
    await expect(page.locator('#sw-studio .swatch[data-id="cinetica"]')).toBeVisible();

    await page.click('#agedTray');
    await expect(page.locator('#board')).toHaveAttribute('data-aged','');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(0);
    noErrors(page);
  });

  test('About tells you what a style is drawn from',async({browser})=>{
    const page=await device(browser,{width:390,height:844,phone:true});
    await page.route(/images\.metmuseum\.org/,r=>r.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="4" height="3"/>'}));
    await page.goto('/'); await page.click('#tab-look');
    await page.click('#trayJump button[data-g="museum"]');            // a chip opens its group
    await expect(page.locator('#grp-museum')).toHaveClass(/open/);
    await page.click('.swatch[data-id="william"] .sw-about');
    await expect(page.locator('#aboutDlg')).toBeVisible();
    await expect(page.locator('#abWork')).toContainText('Hippopotamus');
    await expect(page.locator('#abLink')).toHaveAttribute('href',/collection\/search\/544227$/);
    await expect(page.locator('#abPic')).toBeVisible();
    await page.click('#abTry');                                        // try it from the sheet
    await expect(page.locator('#aboutDlg')).toBeHidden();
    await expect(page.locator('#board')).toHaveAttribute('data-style','william');
    await page.click('#tryUse'); expect(await stored(page,'style')).toBe('william');
    await page.click('.swatch[data-id="tiffany"] .sw-about');         // not public domain: a link, no photo
    await expect(page.locator('#abPic')).toBeHidden(); await expect(page.locator('#abNoPic')).toBeVisible();
    await page.click('#abClose');
    await page.click('.swatch.family .sw-about');                      // Everyday has notes too, with no Met link
    await expect(page.locator('#abLink')).toBeHidden(); await page.keyboard.press('Escape');
    expect(await page.evaluate(()=>BOARD_STYLES.filter(s=>!STYLE_ART[s.id]).map(s=>s.id))).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(0);
    noErrors(page);
  });

  test('every style renders without errors',async({browser})=>{
    const page=await device(browser); await page.goto('/');
    const ids=await page.$$eval('#styleTray .swatch[data-id]',x=>[...new Set(x.map(c=>c.dataset.id))]);
    expect(ids.length).toBeGreaterThan(30);
    for(const id of ids){await page.evaluate(i=>{const b=document.querySelector('.swatch[data-id="'+i+'"] .sw-main');b.click();b.click()},id)}
    noErrors(page);
  });
});
