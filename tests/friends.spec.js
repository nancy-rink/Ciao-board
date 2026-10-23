const {test,expect}=require('@playwright/test');
const {device,stored,openCard,putOnBoard,noErrors,RELAY}=require('./helpers');

test('two boards connect, exchange an encrypted message, and ignore a forgery',async({browser})=>{
  const a=await device(browser); await a.goto('/');
  await openCard(a,'friends'); await a.fill('#frName','Nancy'); await a.dispatchEvent('#frName','change');
  await a.click('#frInvite'); await expect(a.locator('#frInviteOut')).toBeVisible();
  const code=(await a.textContent('#frCode')).replace(/\W/g,'');

  const b=await device(browser,{storage:{'beta2.fb.friends':JSON.stringify({name:'Sam',hold:0.25,allow:true})}});
  await b.goto('/#invite='+code); await expect(b.locator('#frAsk')).toBeVisible();
  await b.click('#frAccept');
  await expect(a.locator('#frList')).toContainText('Sam',{timeout:60e3});
  await expect(b.locator('#frList')).not.toContainText('waiting',{timeout:60e3});
  const sa=await stored(a,'friends'), sb=await stored(b,'friends');
  expect(sa.links[0].key).toBe(sb.links[0].key); expect(sa.invites).toHaveLength(0);

  // A third board with the same (now spent) invite code can't join, and a message it forges with the invite's key is ignored
  const c=await device(browser,{storage:{'beta2.fb.friends':JSON.stringify({name:'Mallory'})}});
  await c.goto('/#invite='+code); await expect(c.locator('#frAsk')).toBeVisible(); await c.click('#frAccept');
  await c.waitForTimeout(5000);
  await expect(a.locator('#frList')).not.toContainText('Mallory');
  const l=(await stored(c,'friends')).links[0];
  await c.evaluate(async([l,relay])=>{
    const enc=x=>btoa(String.fromCharCode(...new Uint8Array(x))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    const dec=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),ch=>ch.charCodeAt(0));
    const k=await crypto.subtle.importKey('raw',dec(l.ikey),'AES-GCM',false,['encrypt']), iv=crypto.getRandomValues(new Uint8Array(12));
    const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},k,new TextEncoder().encode(JSON.stringify({type:'msg',text:'FAKE FROM MALLORY'})));
    await fetch(relay+l.topic,{method:'POST',body:'ciao1 '+l.id+' '+enc(iv)+'.'+enc(ct)});
  },[l,RELAY]);

  await putOnBoard(b,'clock');
  await openCard(a,'friends'); await a.fill('#frMsg','HELLO SAM\nDINNER AT 7?'); await a.dispatchEvent('#frMsg','input'); await a.click('#frSend');
  await expect(b.locator('#fnote')).toBeVisible({timeout:60e3});
  await expect(b.locator('#fnoteMsg')).toContainText('Nancy');
  expect((await stored(a,'friends')).waiting).toHaveLength(0);                 // the forgery never arrived as a message
  await b.click('#fnoteShow');
  await expect(b.locator('#boardText')).toContainText('HELLO SAM',{timeout:40e3});
  await expect.poll(()=>stored(b,'mode'),{timeout:40e3}).toBe('clock');         // and the board goes back to what it was showing
  noErrors(a,b,c);
});
