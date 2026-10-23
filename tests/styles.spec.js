const {test,expect}=require('@playwright/test');
const {device,stored,noErrors}=require('./helpers');

test.describe('style picker',()=>{
  test.beforeEach(async({page})=>{});
  test('try, cancel, use, double-tap, Everyday dots, favorites, filters',async({browser})=>{
    const page=await device(browser,{width:390,height:844,phone:true}); await page.goto('/');
    await page.click('#tab-look');
    const card=id=>page.locator('#styleTray .swatch[data-id="'+id+'"]:not(#sw-fav *) .sw-main');

    await card('oxblood').click();                                   // try
    await expect(page.locator('#board')).toHaveAttribute('data-style','oxblood');
    await expect(page.locator('#tryName')).toHaveText('Trying Oxblood');
    expect(await stored(page,'style')).toBe('classic');
    await page.click('#tryCancel');                                  // cancel
    await expect(page.locator('#board')).toHaveAttribute('data-style','classic');

    await card('taipei').click(); await page.click('#tryUse');       // use
    expect(await stored(page,'style')).toBe('taipei');
    await card('graphite').click(); await card('graphite').click();  // a second tap keeps it
    expect(await stored(page,'style')).toBe('graphite');

    await page.click('.sw-dots button[data-id="harbor"]'); await page.click('#tryUse');
    expect(await stored(page,'style')).toBe('harbor');
    await expect(page.locator('.swatch.family .nm2 span')).toHaveText('Everyday · Harbor');

    for(const id of ['oxblood','zsolnay','plakat'])await page.locator('#styleTray .swatch[data-id="'+id+'"]:not(#sw-fav *) .sw-fav').click();
    await expect(page.locator('#sw-fav .swatch')).toHaveCount(3);
    await page.click('#tab-show'); await page.click('#status');
    const seen=[]; for(let i=0;i<4;i++){await page.keyboard.press('s');seen.push(await stored(page,'style'))}
    expect(seen).toEqual(['oxblood','zsolnay','plakat','oxblood']);    // S steps through favorites

    await page.click('#tab-look'); await page.click('#trayTone button[data-tone="dark"]');
    await expect(page.locator('#styleTray .swatch[data-id="daylight"]')).toHaveCount(0); // Everyday is one card
    await expect(page.locator('#sw-studio .swatch[data-id="plakat"]')).toBeHidden();     // a light style
    await expect(page.locator('#sw-studio .swatch[data-id="cinetica"]')).toBeVisible();

    await page.click('#agedTray');
    await expect(page.locator('#board')).toHaveAttribute('data-aged','');
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
