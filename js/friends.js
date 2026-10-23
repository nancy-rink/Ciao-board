// Friends: the relay, invites and the encrypted link between two boards (also used by the remote).
// Friends: send messages between boards whose owners have both agreed, through the free ntfy.sh relay (no account or setup).
// Each board listens on its own unguessable inbox topic. The invite (found with its code) carries the inviter's topic and a one-time key
// for the handshake; on accepting, the two boards run an ECDH key exchange, so only those two boards hold the key their messages are sealed
// with, even if someone else saw the code. The relay only ever carries sealed messages; both relays keep them 12 hours.
// Two relays: our own on Cloudflare (relay/), with no daily cap, and ntfy.sh. Every board listens on both. A link moves to
// ours once the other board shows it listens there too (its messages carry cf:1), and falls back to ntfy.sh if ours can't
// be reached; links with a board that hasn't updated yet stay on ntfy.sh.
const NTFY=window.__ciaoNtfy||'https://ntfy.sh/'; // tests point the board at local stand-ins
const CF=window.__ciaoRelay!==undefined?window.__ciaoRelay:'https://ciao-relay.nancyrink.workers.dev/'; // '' turns it off
function frRand(n){const A='abcdefghijkmnopqrstuvwxyz23456789',r=crypto.getRandomValues(new Uint32Array(n));return [...r].map(x=>A[x%A.length]).join('')}
const fr=Object.assign({name:'',allow:true,hold:5,inbox:'',links:[],invites:[],waiting:[],seen:[],since:''},store.get('fb.friends',{}));
if(!fr.inbox)fr.inbox='cb'+frRand(30);
let frES=null, frWS=null, frWSOpen=false, frWSTries=0, frHoldT=null, frPending=null, frNoteShownFor='';
function saveFr(){store.set('fb.friends',fr)}
saveFr();
function frSay(t){$('frStatus').textContent=t}
const b64u={enc:b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''),dec:s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))};
const te=new TextEncoder(), td=new TextDecoder(), frKeys=new Map();
function frKey(raw){if(!frKeys.has(raw))frKeys.set(raw,crypto.subtle.importKey('raw',b64u.dec(raw),'AES-GCM',false,['encrypt','decrypt']));return frKeys.get(raw)}
async function frSeal(key,obj){const iv=crypto.getRandomValues(new Uint8Array(12));return b64u.enc(iv)+'.'+b64u.enc(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,te.encode(JSON.stringify(obj))))}
async function frOpen(key,s){const [iv,ct]=String(s).split('.');return JSON.parse(td.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:b64u.dec(iv)},key,b64u.dec(ct))))}
// An invite code names a hidden topic and unlocks what's posted there; the code itself never reaches the relay
async function frInviteTopic(code){const h=new Uint8Array(await crypto.subtle.digest('SHA-256',te.encode('ciao-board-invite:'+code)));return 'cbi'+[...h.slice(0,20)].map(b=>b.toString(16).padStart(2,'0')).join('')}
async function frInviteKey(code){const k=await crypto.subtle.importKey('raw',te.encode(code),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt:te.encode('ciao-board-invite'),iterations:200000,hash:'SHA-256'},k,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
const frCodeFmt=c=>c.length===6?c.slice(0,3)+' '+c.slice(3):c.slice(0,4)+'-'+c.slice(4);
const frCodeNorm=v=>String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
// A TV's pairing code is 6 digits; it only works while the TV shows it, and the relay's rate limits make guessing one impractical
function frNewCode(kind){
  if(kind==='tv'){const r=crypto.getRandomValues(new Uint32Array(6));return [...r].map(n=>n%10).join('')}
  const A='ABCDEFGHJKMNPQRSTUVWXYZ23456789',r=crypto.getRandomValues(new Uint32Array(8));return [...r].map(n=>A[n%A.length]).join('');
}
const frTvCodeOk=c=>/^\d{6}$/.test(c)||c.length===8;
// ntfy.sh lets each internet connection post 250 messages a day (refilling through the day), and a home's TV and phone share one.
// When it's used up the relay answers 429; frLimited remembers when, so the board can say so instead of failing quietly.
// It also slows down a connection that sends a burst of requests, which passes within a minute.
let frLimited=0, frDaily=false;
const frIsLimited=()=>Date.now()-frLimited<(frDaily?10*60e3:45e3);
const FR_DAILY_MSG='The free relay\'s daily message limit for your home network is used up, so the TV and phone can\'t talk for now. It refills through the day; try again in an hour or so.';
const FR_BUSY_MSG='The free relay is asking your home network to slow down. Give it a minute.';
const frLimitMsg=()=>frDaily?FR_DAILY_MSG:FR_BUSY_MSG;
// Posts to our relay when the link is on it, and to ntfy.sh if that fails or the link isn't
async function frPost(topic,body,cf){
  if(cf&&CF){try{const r=await fetch(CF+topic,{method:'POST',body});if(r.ok)return}catch(e){}}
  const r=await fetch(NTFY+topic,{method:'POST',body});
  if(r.status===429){
    let j={}; try{j=await r.json()}catch(x){}
    frLimited=Date.now(); frDaily=j.code===42908||/messages|quota/i.test(j.error||'');
    const e=new Error('limit'); e.limit=true; e.daily=frDaily; throw e;
  }
  if(!r.ok)throw new Error('HTTP '+r.status);
}
// Everything a board sends a friend goes to the friend's inbox as "ciao1 <link id> <sealed>"
// cf:1 inside the sealed message tells the other board this one listens on our relay
async function frPostSealed(topic,id,raw,obj,cf){await frPost(topic,'ciao1 '+id+' '+await frSeal(await frKey(raw),CF?Object.assign({cf:1},obj):obj),cf)}
async function frSend(link,obj){await frPostSealed(link.topic,link.id,link.key,obj,link.cf)}
const frLink=id=>fr.links.find(l=>l.id===id);
const frLive=id=>{const l=frLink(id);return l&&!l.pending?l:null};
const ECDH={name:'ECDH',namedCurve:'P-256'};
const frEcdh=()=>crypto.subtle.generateKey(ECDH,true,['deriveBits']);
const frPub=async kp=>b64u.enc(await crypto.subtle.exportKey('raw',kp.publicKey));
async function frShared(priv,pubRaw){
  const pub=await crypto.subtle.importKey('raw',b64u.dec(pubRaw),ECDH,false,[]);
  return b64u.enc(await crypto.subtle.digest('SHA-256',await crypto.subtle.deriveBits({name:'ECDH',public:pub},priv,256)));
}
function frListen(){
  frPollSoon();
  if(frES&&frES.readyState===2){frES.close();frES=null}
  if(frES||(!fr.links.length&&!fr.invites.length))return;
  frES=new EventSource(NTFY+fr.inbox+'/sse?since='+encodeURIComponent(fr.since||'12h'));
  frES.onmessage=e=>{try{const m=JSON.parse(e.data);if(m.event==='message')frReceive(m)}catch(x){}};
  frES.onerror=()=>{if(frES&&frES.readyState===2)setTimeout(frListen,5000);if(!frPollT)frPollSoon()};
  frListenCf();
}
// Our relay's live connection is a WebSocket (it costs nothing while idle, so a TV can hold one all day). A ping every
// 30 seconds keeps routers from dropping it; if it closes, it reconnects with a growing pause, and polling covers the gap.
function frListenCf(){
  if(!CF||frWS||(!fr.links.length&&!fr.invites.length))return;
  let ws, ping=null;
  try{ws=new WebSocket(CF.replace(/^http/,'ws')+fr.inbox+'/ws?since='+encodeURIComponent(fr.sinceCf||'12h'))}catch(e){return}
  frWS=ws;
  ws.onopen=()=>{frWSOpen=true;frWSTries=0;ping=setInterval(()=>{try{ws.send('ping')}catch(e){}},30000)};
  ws.onmessage=e=>{try{const m=JSON.parse(e.data);if(m.event==='message')frReceive(m,'cf')}catch(x){}};
  ws.onclose=()=>{clearInterval(ping);if(frWS===ws){frWS=null;frWSOpen=false}frWSTries=Math.min(frWSTries+1,6);setTimeout(frListenCf,1000*2**frWSTries);if(!frPollT)frPollSoon()};
}
// The stream can stall (phones pause it in the background, some TV browsers drop it), and a missed handshake
// leaves pairing stuck. While one is in progress, also ask the relay for anything new every few seconds.
let frPollT=null, frPolling=false;
const frHandshaking=()=>fr.links.some(l=>l.pending)||fr.invites.some(i=>Date.now()-i.made<15*60e3);
async function frPoll(force){
  if(frPolling||(!fr.links.length&&!fr.invites.length))return;
  frPolling=true;
  const pull=async(base,since,via)=>{
    const r=await fetch(base+fr.inbox+'/json?poll=1&since='+encodeURIComponent(since||'12h'));
    if(r.status===429&&base===NTFY)frLimited=Date.now();
    if(r.ok)for(const l of (await r.text()).split('\n').filter(Boolean)){try{const m=JSON.parse(l);if(m.event==='message')await frReceive(m,via)}catch(x){}}
  };
  // an open live connection already delivers everything from that relay
  try{if(CF&&(force||!frWSOpen))await pull(CF,fr.sinceCf,'cf')}catch(e){}
  try{if(force||!(frIsLimited()||(frES&&frES.readyState===1)))await pull(NTFY,fr.since,'ntfy')}catch(e){}
  frPolling=false;
}
function frNudge(){
  const now=Date.now(); let drop=false;
  fr.links.filter(l=>l.pending&&l.hello).forEach(l=>{
    if(now-l.at>15*60e3){drop=true;return}
    if((l.tries||0)<3&&(l.cf||!frIsLimited())&&now-l.at>12e3&&now-(l.sentAt||l.at)>15e3){l.sentAt=now;l.tries=(l.tries||0)+1;frPostSealed(l.topic,l.id,l.ikey,l.hello,l.cf).catch(()=>{})}
  });
  if(drop){fr.links=fr.links.filter(l=>!(l.pending&&now-l.at>15*60e3));saveFr();frRender();rmRender()}
}
// While pairing, check every 6 seconds. After that, keep checking every 15 seconds for as long as the live stream is down,
// so a TV whose browser keeps dropping the stream still gets the remote's commands.
const frStreamDown=()=>(fr.links.length||fr.invites.length)&&(!(frES&&frES.readyState===1)||(CF&&!frWSOpen));
function frPollSoon(){clearTimeout(frPollT);frPollT=null;const hs=frHandshaking();if(hs||frStreamDown())frPollT=setTimeout(async()=>{frNudge();await frPoll();frPollSoon()},hs?6000:15000)}
function frWake(){if(document.visibilityState!=='visible')return;frListen();frPoll(true);frPollSoon()}
document.addEventListener('visibilitychange',frWake); addEventListener('online',frWake); addEventListener('pageshow',frWake);
async function frReceive(m,via){
  if(fr.seen.includes(m.id))return;
  fr.seen=[...fr.seen.slice(-299),m.id]; if(via==='cf')fr.sinceCf=m.id;else fr.since=m.id; saveFr();
  const [tag,id,sealed]=String(m.message||'').split(' ');
  if(tag!=='ciao1')return;
  // Handshake messages are sealed with the invite's key; everything after with the pair's own key
  const link=frLink(id), inv=fr.invites.find(i=>i.id===id), raw=link?(link.pending?link.ikey:link.key):inv?inv.key:null;
  if(!raw)return;
  let o; try{o=await frOpen(await frKey(raw),sealed)}catch(e){
    // A TV that just paired may get the phone's hello again, still sealed with the invite's key
    if(!(link&&!link.pending&&link.ikey))return; try{o=await frOpen(await frKey(link.ikey),sealed)}catch(x){return}}
  let fresh=false;
  if(o.cf&&link&&!link.cf){link.cf=true;saveFr()} // the other board listens on our relay: use it from now on
  if(o.type==='hello'&&link&&!link.pending&&link.wpub&&o.topic===link.topic){
    await frPostSealed(link.topic,id,link.ikey,{type:'welcome',pub:link.wpub},link.cf).catch(()=>{}); return;
  }else if(o.type==='hello'&&inv&&!link&&typeof o.topic==='string'&&typeof o.pub==='string'){
    // Our invite was accepted: the first acceptance wins and the invite is spent
    fr.invites=fr.invites.filter(i=>i.id!==id); saveFr();
    const name=String(o.name||'A friend').slice(0,40), kp=await frEcdh();
    const key=await frShared(kp.privateKey,o.pub);
    const link={id,name,topic:o.topic,key}; if(o.cf)link.cf=true; if(inv.kind==='tv'){link.kind='remote';link.ikey=inv.key;link.wpub=await frPub(kp)}
    fr.links.push(link); saveFr();
    await frPostSealed(o.topic,id,inv.key,{type:'welcome',pub:link.wpub||await frPub(kp)},link.cf).catch(()=>{});
    if(link.kind==='remote')rmPaired(link);
    else{if($('frInviteOut').dataset.id===id)$('frInviteOut').hidden=true;toast('Connected with '+name);frSay('Connected with '+name+'.')}
  }else if(o.type==='welcome'&&link&&link.pending&&!link.busy&&typeof o.pub==='string'){
    link.busy=true; // the first welcome wins
    const priv=await crypto.subtle.importKey('jwk',link.priv,ECDH,false,['deriveBits']);
    link.key=await frShared(priv,o.pub); delete link.pending; delete link.priv; delete link.ikey; delete link.busy; delete link.hello; delete link.at;
    if(link.kind==='tv'){
      fr.links.filter(l=>l.kind==='tv'&&l!==link&&l.name===link.name).forEach(old=>{frSend(old,{type:'bye'}).catch(()=>{});fr.links=fr.links.filter(l=>l!==old)});
      raRepair=false; rmRender(); $('rmTv').value=link.id;
      toast('Connected to '+link.name);rmSay('Connected to '+link.name+'.');frSend(link,{type:'cmd',action:'ping'}).catch(()=>{})}
    else{toast('Connected with '+link.name);frSay('Connected with '+link.name+'.')}
  }else if(o.type==='cmd'&&link&&!link.pending&&link.kind==='remote'){
    if(link.wpub){delete link.wpub;delete link.ikey}
    rmRun(link,o);
  }else if(o.type==='state'&&link&&!link.pending&&link.kind==='tv'){
    link.state={showing:String(o.showing||'').slice(0,80),style:String(o.style||''),styleId:String(o.styleId||''),mode:String(o.mode||''),art:String(o.art||''),section:String(o.section||''),plan:!!o.plan,sound:o.sound&&typeof o.sound==='object'?o.sound:null,perf:String(o.perf||'auto'),lite:!!o.lite,at:Date.now()};
  }else if(o.type==='msg'&&link&&!link.pending&&!link.kind&&typeof o.text==='string'){
    fr.waiting.push({key:m.id,id,text:o.text.slice(0,300),sent:(m.time||0)*1000}); fresh=true;
  }else if(o.type==='bye'&&link&&!link.pending){
    fr.links=fr.links.filter(l=>l.id!==id); fr.waiting=fr.waiting.filter(w=>w.id!==id);
  }else return;
  saveFr(); frRender(); rmRender(); frNotify(fresh);
}
const frName=id=>(frLink(id)||{}).name||'A friend';
function frQueue(){return fr.waiting.filter(m=>frLive(m.id)).sort((a,b)=>a.sent-b.sent)}
// Ask first: a note under the board says who it's from; nothing flips until someone taps Show
function frNotify(fresh){
  const q=frQueue(), n=$('fnote');
  if(!fr.allow||!q.length){n.hidden=true;return}
  const m=q[0], key=m.key+'|'+q.length;
  $('fnoteMsg').textContent=q.length>1?q.length+' messages waiting, first from '+frName(m.id):'New message from '+frName(m.id);
  if(fresh||frNoteShownFor!==key){n.hidden=false;frNoteShownFor=key}
  if(fresh){try{if(snd.on&&!audioBlocked())playChime()}catch(e){}if(document.body.classList.contains('fs'))poke()}
}
$('fnoteShow').onclick=()=>{const m=frQueue()[0];if(m)frShow(m);else $('fnote').hidden=true};
$('fnoteLater').onclick=()=>{$('fnote').hidden=true};
function frDrop(key){fr.waiting=fr.waiting.filter(w=>w.key!==key);saveFr()}
function frShow(m){
  const prev={mode,text:lastSent,sched:schedOn};
  clearTimeout(frHoldT);
  schedDriving=true; try{stopModes()}finally{schedDriving=false}
  send(m.text); $('fnote').hidden=true;
  frDrop(m.key); frRender();
  if(fr.hold>0)frHoldT=setTimeout(()=>{if(mode===''&&lastSent===m.text)frResume(prev)},fr.hold*60000);
  if(frQueue().length)setTimeout(()=>frNotify(),400);
}
// After the hold, go back to whatever the board was doing
function frResume(p){
  if(p.sched&&schedOn){schedKey='';schedApply();return}
  const go={clock:startClock,weather:startWeather,surf:startSurf,calendar:startCalendar,news:startNews,art:()=>startArt(artCur),rotating:()=>{mode='';$('rotateBtn').click()}}[p.mode];
  if(go)go(); else send(p.text||'');
}
function frRender(){
  const fl=$('frList'), friends=fr.links.filter(l=>!l.kind); fl.innerHTML='';
  if(!friends.length)fl.innerHTML='<li class="hint">No connected boards yet. Create an invite below, or type a friend\'s code.</li>';
  friends.forEach(l=>{
    const li=document.createElement('li');
    const t=document.createElement('span'); t.className='txt'; t.textContent=l.name+(l.pending?' (waiting for their board to confirm)':'');
    const w=document.createElement('button'); w.type='button'; w.className='show'; w.textContent='Message'; w.hidden=!!l.pending;
    w.onclick=()=>{$('frTo').value=l.id;$('frMsg').focus()};
    const x=document.createElement('button'); x.type='button'; x.className='x'; x.textContent='Disconnect'; x.setAttribute('aria-label','Disconnect from '+l.name);
    x.onclick=()=>{
      if(!confirm('Disconnect from '+l.name+'? Neither board will be able to message the other until you connect again.'))return;
      if(!l.pending)frSend(l,{type:'bye'}).catch(()=>{});
      fr.links=fr.links.filter(k=>k.id!==l.id); fr.waiting=fr.waiting.filter(w=>w.id!==l.id); saveFr(); frRender(); frNotify();
    };
    li.append(t,w,x); fl.appendChild(li);
  });
  const ib=$('frInbox'); ib.innerHTML=''; const q=frQueue();
  if(!q.length)ib.innerHTML='<li class="hint">Nothing waiting.</li>';
  q.forEach(m=>{
    const li=document.createElement('li');
    const t=document.createElement('span'); t.className='txt'; tokenSpans(t,frName(m.id)+': '+m.text.replace(/\n/g,' / ').toUpperCase());
    const sh=document.createElement('button'); sh.type='button'; sh.className='show'; sh.textContent='Show'; sh.onclick=()=>frShow(m);
    const x=document.createElement('button'); x.type='button'; x.className='x'; x.textContent='Delete'; x.setAttribute('aria-label','Delete message from '+frName(m.id));
    x.onclick=()=>{frDrop(m.key);frRender();frNotify()};
    li.append(t,sh,x); ib.appendChild(li);
  });
  const to=$('frTo'), keep=to.value; to.innerHTML='';
  const live=fr.links.filter(l=>!l.pending&&!l.kind);
  live.forEach(l=>{const o=document.createElement('option');o.value=l.id;o.textContent=l.name;to.appendChild(o)});
  if(frLive(keep))to.value=keep;
  $('frSendBox').hidden=!live.length;
  try{updateSubs()}catch(e){}
}
function frMsgText(){return fromEmoji($('frMsg').value)}
function frCount(){const n=layout(frMsgText()).length;$('frCount').textContent=n>ROWS?n+' lines, '+(n-ROWS)+' won\'t fit':n+' of 6 lines';$('frCount').classList.toggle('over',n>ROWS)}
$('frMsg').addEventListener('input',()=>{liveTokens($('frMsg'));frCount()});
document.querySelectorAll('#pane-friends .chip').forEach(b=>b.onclick=()=>{
  const el=$('frMsg'),tok=EMO[b.dataset.c],s0=el.selectionStart??el.value.length,e0=el.selectionEnd??s0;
  el.value=el.value.slice(0,s0)+tok+el.value.slice(e0); el.focus(); el.selectionStart=el.selectionEnd=s0+tok.length; frCount();
});
$('frSend').onclick=async()=>{
  const l=frLive($('frTo').value), text=frMsgText().trim();
  if(!l||!text)return;
  if(layout(text).length>ROWS||text.length>300){frCount();toast('That won\'t fit on the board. Make it shorter.');return}
  $('frSend').disabled=true;
  try{await frSend(l,{type:'msg',text});$('frMsg').value='';frCount();toast('Sent to '+l.name)}
  catch(e){toast('Couldn\'t send. Check the connection and try again.')}
  finally{$('frSend').disabled=false}
};
function frNeedName(){if(fr.name.trim())return false;frSay('Give your board a name first, so your friend knows who it is.');$('frName').focus();return true}
$('frName').value=fr.name; $('frName').onchange=()=>{fr.name=$('frName').value.trim().slice(0,40);saveFr();frSay('Saved. Friends you connect from now on will see this name.')};
$('frAllow').checked=fr.allow; $('frAllow').onchange=()=>{fr.allow=$('frAllow').checked;saveFr();frNotify()};
$('frHold').value=String(fr.hold); $('frHold').onchange=()=>{fr.hold=+$('frHold').value;saveFr()};
// Invites, shared by Friends and Remote. kind 'tv' marks a TV asking for a phone remote.
async function frMakeInvite(kind,name){
  const code=frNewCode(kind), id=frRand(12), key=b64u.enc(crypto.getRandomValues(new Uint8Array(32)));
  // Posted to both relays, so a board that hasn't updated yet can still find it; either one is enough
  const topic=await frInviteTopic(code), body=await frSeal(await frInviteKey(code),CF?{v:1,id,name,topic:fr.inbox,key,kind,cf:1}:{v:1,id,name,topic:fr.inbox,key,kind});
  const sent=await Promise.allSettled([CF?fetch(CF+topic,{method:'POST',body}).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status)}):Promise.reject(new Error('off')),frPost(topic,body)]);
  if(!sent.some(x=>x.status==='fulfilled'))throw sent[1].reason;
  // Keep the last few invites for 12 hours, always including the TV start screen's
  const keepId=(store.get('fb.tvInvite',null)||{}).id, fresh=fr.invites.filter(i=>Date.now()-i.made<432e5);
  fr.invites=[...fresh.filter(i=>i.id===keepId),...fresh.filter(i=>i.id!==keepId).slice(-8),{id,key,kind,made:Date.now()}]; saveFr(); frListen();
  return {code,id};
}
async function frFetchInvite(code){
  // Our relay first, then ntfy.sh (where a board that hasn't updated yet posts its invites)
  const topic=await frInviteTopic(code), key=await frInviteKey(code); let err=null, reached=false;
  for(const base of CF?[CF,NTFY]:[NTFY]){
    try{
      const r=await fetch(base+topic+'/json?poll=1&since=12h'); if(!r.ok)throw new Error('HTTP '+r.status); reached=true;
      const posts=(await r.text()).split('\n').filter(Boolean).map(l=>JSON.parse(l)).filter(m=>m.event==='message');
      for(const p of posts.reverse()){try{return await frOpen(key,p.message)}catch(e){}}
    }catch(e){err=e}
  }
  if(!reached)throw err;
  return null;
}
// Accept an invite: the link waits as pending until the other board answers the key exchange
async function frConnect(inv,kind,name){
  const kp=await frEcdh();
  const link={id:String(inv.id),name:String(inv.name||'A friend').slice(0,40),topic:String(inv.topic),ikey:String(inv.key),pending:true,priv:await crypto.subtle.exportKey('jwk',kp.privateKey)};
  if(kind)link.kind=kind; if(inv.cf&&CF)link.cf=true;
  fr.links.push(link); saveFr(); frListen();
  link.hello={type:'hello',name,topic:fr.inbox,pub:await frPub(kp)}; link.at=Date.now();
  try{await frPostSealed(link.topic,link.id,link.ikey,link.hello,link.cf)}
  catch(e){fr.links=fr.links.filter(l=>l!==link);saveFr();throw e}
  return link;
}
$('frInvite').onclick=async()=>{
  if(frNeedName())return;
  $('frInvite').disabled=true;
  try{
    const {code,id}=await frMakeInvite(undefined,fr.name);
    $('frCode').textContent=frCodeFmt(code); $('frLink').value=location.origin+location.pathname+'#invite='+code;
    $('frInviteOut').dataset.id=id; $('frInviteOut').hidden=false;
    frSay('Send the code or the link to your friend. When they accept, their board appears under Connected boards.');
  }catch(e){frSay('Couldn\'t create an invite. Check the connection and try again.')}
  finally{$('frInvite').disabled=false}
};
$('frCopy').onclick=async()=>{try{await navigator.clipboard.writeText($('frLink').value);toast('Link copied')}catch(e){$('frLink').select()}};
async function frLookup(raw){
  const code=frCodeNorm(raw); $('frAsk').hidden=true; frPending=null;
  if(code.length!==8){frSay('Invite codes have 8 letters and numbers, like K7Q4-MX2P.');return}
  frSay('Looking up the invite…');
  try{
    const inv=await frFetchInvite(code);
    if(!inv){frSay('That code doesn\'t match an invite. It may have expired (invites last 12 hours) or been mistyped.');return}
    if(inv.kind==='tv'){frSay('That\'s a code for pairing a phone with a TV. Open Remote and type it there.');return}
    if(inv.topic===fr.inbox){frSay('That\'s your own invite. Send it to your friend instead.');return}
    if(frLink(inv.id)){frSay('You\'re already connected with '+inv.name+'.');return}
    frPending=inv; $('frAskMsg').textContent='Connect with '+inv.name+'? You\'ll be able to send each other messages, and you\'re asked before any message is shown.'; $('frAsk').hidden=false;
    frSay('Found an invite from '+inv.name+'.');
  }catch(e){frSay('Couldn\'t look up that code. Check the connection and try again.')}
}
$('frLook').onclick=()=>frLookup($('frCodeIn').value);
$('frCodeIn').onkeydown=e=>{if(e.key==='Enter')frLookup($('frCodeIn').value)};
$('frDecline').onclick=()=>{frPending=null;$('frAsk').hidden=true;$('frCodeIn').value='';frSay('Declined. Nothing was connected.')};
$('frAccept').onclick=async()=>{
  if(!frPending||frNeedName())return;
  const inv=frPending;
  $('frAccept').disabled=true;
  try{
    const link=await frConnect(inv,undefined,fr.name);
    frPending=null; $('frAsk').hidden=true; $('frCodeIn').value=''; frRender();
    frSay('Waiting for '+link.name+'\'s board to confirm. That happens as soon as it\'s online.');
  }catch(e){frRender();frSay('Couldn\'t connect. Check the connection and try again.')}
  finally{$('frAccept').disabled=false}
};
function frBoot(){
  buildRemote(); if(remoteMode)raInit(); frRender(); rmRender(); frCount(); rmCount(); frListen(); frNotify();
  if(!remoteMode){frHash(); addEventListener('hashchange',frHash)}
  if(rmPhones().length)setTimeout(()=>rmPhones().forEach(l=>rmState(l)),2500);
  try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist()}catch(e){}
}
// An invite link (#invite=CODE) opens the Friends tab and asks whether to connect
function frHash(){
  const p=location.hash.match(/^#pair=([A-Za-z0-9-]+)/);
  if(p){history.replaceState(null,'',location.pathname+location.search);showView('connect');$('rmCodeIn').value=frCodeFmt(frCodeNorm(p[1]));rmLookup(p[1]);return true}
  const m=location.hash.match(/^#invite=([A-Za-z0-9-]+)/); if(!m)return false;
  history.replaceState(null,'',location.pathname+location.search);
  showView('connect'); $('frCodeIn').value=frCodeFmt(frCodeNorm(m[1])); frLookup(m[1]);
  return true;
}
