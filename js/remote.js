// The phone remote: pairing, commands and reports, the TV start screen, and the full-screen remote.
// Remote: a phone controls a Ciao Board on a TV. The TV shows a pairing code (and a QR code for the phone's camera);
// the phone connects with the same invite and key exchange as Friends, then sends commands the TV carries out straight away.
// A paired phone is trusted, so unlike friends' messages nothing waits for a tap. After each command the TV reports what it's showing.
let rmPairing=null, rmPairT=null;
const rmTvs=()=>fr.links.filter(l=>l.kind==='tv'), rmPhones=()=>fr.links.filter(l=>l.kind==='remote');
function rmSay(t){$('rmStatus').textContent=t}
function rmShowing(){
  if(mode===''&&boardLabel&&/^Picture: /.test(boardLabel))return 'Art: '+boardLabel.slice(9);
  if(mode==='')return lastSent?lastSent.replace(/\{[roygbvw]\}/gi,'').split('\n').map(l=>l.trim()).filter(Boolean).join(' / ').toUpperCase().slice(0,60)||'color tiles':'a blank board';
  if(mode==='news')return 'BBC headlines';
  if(mode==='art')return 'Art: '+((ART_BY[artCur]||{}).name||'animation');
  return MODE_NAME[mode]||mode;
}
function rmState(link,again){
  const st=BOARD_STYLES.find(x=>x.id===styleId);
  frSend(link,{type:'state',showing:rmShowing(),style:st?st.name:styleId,styleId,mode,art:artCur,section:news.section,plan:schedOn,
    sound:{on:snd.on,vol:snd.vol,style:snd.style,chime:snd.chime,ambient:snd.ambient,blocked:snd.on&&audioBlocked()},perf:anim.perf,lite:lite()}).catch(e=>{if(e.limit&&!e.daily&&!again)setTimeout(()=>rmState(link,true),6000)});
}
// On the TV: carry out a command from a paired phone, then report back
function rmRun(link,o){
  const ok={
    text:()=>{if(typeof o.text==='string'){stopModes();send(o.text.slice(0,300))}},
    clear:()=>{stopModes();send('')},
    style:()=>{if(BOARD_STYLES.some(s=>s.id===o.id))applyStyle(o.id)},
    clock:()=>startClock(),
    news:()=>{if(NEWS_HEAD[o.section]){news.section=o.section;saveNews();$('newsSection').value=o.section}startNews()},
    art:()=>{const a=ART_BY[o.id];if(a)a.frame?startArt(o.id):showArt(o.id)},
    saved:()=>{if(mode!=='rotating'&&saved.length){mode='';$('rotateBtn').click()}},
    plan:()=>{if(o.on)startSchedule();else{schedOff();stopModes()}},
    sound:()=>{
      if(typeof o.on==='boolean'&&o.on!==snd.on){snd.on=o.on;if(snd.on)try{ensureAudio()}catch(e){}}
      if(typeof o.vol==='number'){snd.vol=Math.min(1,Math.max(0,o.vol));if(master)master.gain.value=snd.vol}
      if(o.style&&[...$('sndStyle').options].some(x=>x.value===o.style&&!x.disabled))snd.style=o.style;
      if(o.chime&&[...$('chimeStyle').options].some(x=>x.value===o.chime))snd.chime=o.chime;
      if(o.ambient&&[...$('sndAmb').options].some(x=>x.value===o.ambient)){snd.ambient=o.ambient;ambientStart()}
      saveSnd(); renderSound(); checkAudio();
      if(o.test)$('testBtn').click();
    },
    perf:()=>{if(['auto','smooth','best'].includes(o.perf)){anim.perf=o.perf;perfSlow=false;store.set('fb.perfSlow',false);applyAnim()}},
    ping:()=>{}
  }[o.action];
  if(!ok)return;
  try{ok()}catch(e){}
  clearTimeout(link.stT); link.stT=setTimeout(()=>rmState(link),900);
}
// On the TV: show a pairing code on the board and a QR code in the corner until a phone connects
async function rmShowCode(){
  if(rmPairing)return;
  $('rmPairBtn').disabled=true;
  try{
    const {code,id}=await frMakeInvite('tv',fr.name||'TV');
    rmPairing={id,code,prev:{mode,text:lastSent,sched:schedOn}};
    schedDriving=schedOn; try{stopModes()}finally{schedDriving=false}
    send('{b} PAIR A PHONE {b}\n\nON YOUR PHONE GO TO\nCIAO BOARD - REMOTE\n\nCODE '+frCodeFmt(code),{label:'Pairing code '+frCodeFmt(code)});
    $('rmPairCode').textContent=frCodeFmt(code); $('rmPairCard').hidden=false; $('rmPairCancel').focus();
    document.body.classList.add('pairing'); requestAnimationFrame(fitFill);
    clearTimeout(rmPairT); rmPairT=setTimeout(()=>rmEndPairing(true),10*60e3);
    rmQr(rmPairUrl(code)).catch(()=>{$('rmQr').hidden=true});
  }catch(e){toast(e.limit?frLimitMsg():'Couldn\'t make a pairing code. Check the connection and try again.')}
  finally{$('rmPairBtn').disabled=false}
}
function rmQr(url,box){
  box=box||'rmQr';
  const draw=()=>{const q=qrcode(0,'M');q.addData(url);q.make();$(box).innerHTML=q.createSvgTag({cellSize:6,margin:2,scalable:true});$(box).hidden=false};
  if(window.qrcode){draw();return Promise.resolve()}
  return new Promise((ok,no)=>{const sc=document.createElement('script');sc.src='https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';sc.onload=()=>{try{draw();ok()}catch(e){no(e)}};sc.onerror=no;document.head.appendChild(sc)});
}
function rmEndPairing(cancel){
  if(!rmPairing)return;
  const p=rmPairing; rmPairing=null; clearTimeout(rmPairT);
  $('rmPairCard').hidden=true; document.body.classList.remove('pairing'); requestAnimationFrame(fitFill);
  if(cancel){fr.invites=fr.invites.filter(i=>i.id!==p.id);saveFr()}
  frResume(p.prev);
}
function rmPaired(link){
  if(rmPairing&&rmPairing.id===link.id)rmEndPairing(false);
  if(tvInvite===link.id){tvInvite=null;store.set('fb.tvInvite',null);$('tvStart').hidden=true;requestAnimationFrame(fitFill)}
  toast('Phone connected: '+link.name); rmSay(link.name+' can now control this board.');
  setTimeout(()=>rmState(link),800);
}
const rmPairUrl=code=>location.origin+location.pathname+'?remote#pair='+code;
// TV mode: the start screen carries a pairing code, so a phone can pair without touching the TV's remote
let tvInvite=null;
async function tvStartPair(){
  try{
    let keep=store.get('fb.tvInvite',null);
    if(!keep||keep.code.length!==6||Date.now()-keep.made>11*3600e3||!fr.invites.some(i=>i.id===keep.id)){
      const made=await frMakeInvite('tv',fr.name||'TV'); keep={code:made.code,id:made.id,made:Date.now()}; store.set('fb.tvInvite',keep);
    }
    const {code,id}=keep; tvInvite=id;
    $('tvCode').textContent=frCodeFmt(code); $('tvRemoteUrl').textContent=location.host+location.pathname.replace(/[^/]*$/,'')+'remote'; $('tvPairBox').hidden=false;
    rmQr(rmPairUrl(code),'tvQr').catch(()=>{$('tvQr').hidden=true});
  }catch(e){
    $('tvPairBox').hidden=false; $('tvQr').hidden=true;
    $('tvPairBox').querySelector('p').textContent=e.limit?frLimitMsg():'Couldn\'t make a pairing code: the TV can\'t reach the relay. Check its internet connection, then reload the page.';
  }
}
$('rmPairBtn').onclick=rmShowCode;
$('rmPairCancel').onclick=()=>rmEndPairing(true);
// On the phone: find the TV's code and connect
let rmPending=null;
async function rmLookup(raw){
  const code=frCodeNorm(raw); $('rmAsk').hidden=true; rmPending=null;
  if(!frTvCodeOk(code)){rmSay('The pairing code is the 6 numbers on the TV, like 482 917.');return}
  rmSay('Looking up the code…');
  try{
    const inv=await frFetchInvite(code);
    if(!inv){rmSay('That code doesn\'t match. Check it on the TV, or choose Pair a phone again for a new one.');return}
    if(inv.kind!=='tv'){rmSay('That\'s a Friends invite. Open Friends and type it there.');return}
    if(inv.topic===fr.inbox){rmSay('That\'s this board\'s own code. Type it on your phone instead.');return}
    if(frLink(inv.id)){rmSay('This phone is already paired with '+inv.name+'.');return}
    rmPending=inv; $('rmAskMsg').textContent='Control '+inv.name+' from this phone?'; $('rmAsk').hidden=false; rmSay('Found '+inv.name+'.');
  }catch(e){rmSay('Couldn\'t look up that code. Check the connection and try again.')}
}
$('rmLook').onclick=()=>rmLookup($('rmCodeIn').value);
$('rmCodeIn').onkeydown=e=>{if(e.key==='Enter')rmLookup($('rmCodeIn').value)};
$('rmCodeIn').addEventListener('input',()=>{if(/^\d{6}$/.test(frCodeNorm($('rmCodeIn').value)))rmLookup($('rmCodeIn').value)});
$('rmDecline').onclick=()=>{rmPending=null;$('rmAsk').hidden=true;$('rmCodeIn').value='';rmSay('Nothing was paired.')};
$('rmAccept').onclick=async()=>{
  if(!rmPending)return; const inv=rmPending; $('rmAccept').disabled=true;
  try{const link=await frConnect(inv,'tv',fr.name||'Phone');rmPending=null;$('rmAsk').hidden=true;$('rmCodeIn').value='';rmSay('Waiting for '+link.name+' to confirm…');rmRender()}
  catch(e){rmSay('Couldn\'t connect. Check the connection and try again.')}
  finally{$('rmAccept').disabled=false}
};
// On the phone: send a command to the chosen TV
const rmTv=()=>{const l=frLink($('rmTv').value);return l&&!l.pending&&l.kind==='tv'?l:null};
async function rmCmd(o,done){
  const tv=rmTv(); if(!tv)return;
  try{await frSend(tv,Object.assign({type:'cmd'},o));rmSay(done||'Sent to '+tv.name+'.')}
  catch(e){rmSay(e.limit?frLimitMsg():'Couldn\'t reach '+tv.name+'. Check the connection and try again.')}
}
function rmMsgText(){return fromEmoji($('rmMsg').value)}
function rmCount(){const n=layout(rmMsgText()).length;$('rmCount').textContent=n>ROWS?n+' lines, '+(n-ROWS)+' won\'t fit':n+' of 6 lines';$('rmCount').classList.toggle('over',n>ROWS)}
$('rmMsg').addEventListener('input',()=>{liveTokens($('rmMsg'));rmCount()});
document.querySelectorAll('#pane-remote .chip').forEach(b=>b.onclick=()=>{
  const el=$('rmMsg'),tok=EMO[b.dataset.c],s0=el.selectionStart??el.value.length,e0=el.selectionEnd??s0;
  el.value=el.value.slice(0,s0)+tok+el.value.slice(e0); el.focus(); el.selectionStart=el.selectionEnd=s0+tok.length; rmCount();
});
$('rmSend').onclick=()=>{const t=rmMsgText().trim();if(!t)return;if(layout(t).length>ROWS||t.length>300){rmCount();toast('That won\'t fit on the board. Make it shorter.');return}rmCmd({action:'text',text:t},'Sent to the TV.')};
$('rmClear').onclick=()=>rmCmd({action:'clear'},'Cleared the TV.');
$('rmClock').onclick=()=>rmCmd({action:'clock'},'The TV is showing the clock.');
$('rmNews').onclick=()=>rmCmd({action:'news',section:$('rmNewsSec').value},'The TV is showing BBC headlines.');
$('rmArtGo').onclick=()=>rmCmd({action:'art',id:$('rmArt').value},'The TV is showing '+ART_BY[$('rmArt').value].name+'.');
$('rmSaved').onclick=()=>rmCmd({action:'saved'},'The TV is rotating its saved messages.');
$('rmPlanOn').onclick=()=>rmCmd({action:'plan',on:true},'The TV is running its day plan.');
$('rmPlanOff').onclick=()=>rmCmd({action:'plan',on:false},'The TV\'s day plan is stopped.');
$('rmStyle').onchange=()=>{if($('rmStyle').value)rmCmd({action:'style',id:$('rmStyle').value},'Style changed on the TV.')};
$('rmSndOn').onclick=()=>{const on=$('rmSndOn').getAttribute('aria-pressed')!=='true';rmCmd({action:'sound',on},on?'Sound is on on the TV.':'Sound is off on the TV.')};
$('rmVol').oninput=()=>{$('rmVolOut').textContent=Math.round($('rmVol').value*100)+'%'};
$('rmVol').onchange=()=>rmCmd({action:'sound',vol:+$('rmVol').value},'Volume set to '+Math.round($('rmVol').value*100)+'% on the TV.');
$('rmSndStyle').onchange=()=>rmCmd({action:'sound',style:$('rmSndStyle').value,test:true},'Flap sound changed on the TV.');
$('rmChime').onchange=()=>rmCmd({action:'sound',chime:$('rmChime').value,test:true},'Chime changed on the TV.');
$('rmSndTest').onclick=()=>rmCmd({action:'sound',test:true},'Playing a test on the TV.');
$('rmPerf').onchange=()=>rmCmd({action:'perf',perf:$('rmPerf').value},'Animation setting changed on the TV.');
$('rmTv').onchange=()=>{rmRender();rmCmd({action:'ping'},'')};
// Filled at start-up, once the style list and Art pictures (defined further down) exist
function buildRemote(){
  BOARD_STYLES.forEach(st=>{const o=document.createElement('option');o.value=st.id;o.textContent=st.name;$('rmStyle').appendChild(o)});
  ART.forEach(a=>{const o=document.createElement('option');o.value=a.id;o.textContent=a.name+(a.frame?' (animated)':'');$('rmArt').appendChild(o)});
  $('rmNewsSec').innerHTML=$('newsSection').innerHTML;
  [...$('sndStyle').options].filter(x=>x.value!=='sample').forEach(x=>{const o=document.createElement('option');o.value=x.value;o.textContent=x.textContent;$('rmSndStyle').appendChild(o)});
  $('rmChime').innerHTML=$('chimeStyle').innerHTML;
}
// Remote mode: the full-screen remote. It reuses the remote's pairing and commands; this is only a bigger, simpler face for them.
const remoteMode=new URLSearchParams(location.search).has('remote');
let raOpen=null, raT=null, raRepair=false, raAsked=0, raAskT=null, raVolSet=null, raBlockedSaid=false;
function raNote(t){const n=$('raNote');n.textContent=t;clearTimeout(raT);if(t)raT=setTimeout(()=>{n.textContent=''},4000)}
async function raCmd(o,done,again){const tv=rmTv();if(!tv){raNote('The TV isn\'t connected yet.');return}
  try{await frSend(tv,Object.assign({type:'cmd'},o));raNote(done||'Sent.');raExpect()}
  catch(e){if(e.limit&&!e.daily&&!again){raNote('Sending…');setTimeout(()=>raCmd(o,done,true),4000);return}raNote(e.limit?frLimitMsg():'Couldn\'t reach '+tv.name+'. Check the connection.')}}
// After each command the TV reports back; if it doesn't, it's probably off, closed, or has forgotten this phone
let raQuiet=false;
function raExpect(){
  if(raAsked&&Date.now()-raAsked<20e3&&!raQuiet)return;
  const asked=raAsked=Date.now(); raQuiet=false; clearTimeout(raAskT);
  const heard=()=>{const t=rmTv();return !!(t&&t.state&&t.state.at>=asked)};
  raAskT=setTimeout(()=>{
    if(heard())return; const t=rmTv(); if(t)frSend(t,{type:'cmd',action:'ping'}).catch(()=>{});
    raAskT=setTimeout(()=>{if(!heard()){raQuiet=true;raRender()}},12e3);
  },9e3);
}
function raChips(box,items,cur,act){
  box.innerHTML='';
  items.forEach(([v,label])=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.classList.toggle('on',v===cur);b.onclick=()=>act(v,label);box.appendChild(b)});
}
function raInit(){
  document.body.classList.add('remotemode'); $('remoteApp').hidden=false;
  // Big tiles
  document.querySelectorAll('.ra-grid button').forEach(b=>b.onclick=()=>{
    const k=b.dataset.ra, st=(rmTv()||{}).state||{};
    if(k==='news'||k==='art'){raOpen=raOpen===k?null:k;raRender();return}
    raOpen=null;
    if(k==='clock')raCmd({action:'clock'},'Showing the clock.');
    else if(k==='saved')raCmd({action:'saved'},'Rotating the TV\'s saved messages.');
    else if(k==='clear')raCmd({action:'clear'},'Cleared.');
    else if(k==='plan')raCmd({action:'plan',on:!st.plan},st.plan?'Day plan stopped.':'Day plan running.');
    raRender();
  });
  $('raSend').onclick=()=>{const t=fromEmoji($('raMsg').value).trim();if(!t)return;
    if(layout(t).length>ROWS||t.length>300){raNote('That won\'t fit on the board. Make it shorter.');return}
    raCmd({action:'text',text:t},'Sent to the TV.');$('raMsg').blur()};
  $('raMsg').addEventListener('input',()=>liveTokens($('raMsg')));
  // Style thumbnails, copied from the style picker
  BOARD_STYLES.forEach(st=>{
    const b=document.createElement('button'); b.type='button'; b.dataset.id=st.id;
    b.appendChild(miniBoard(st.id));
    b.append(st.name); b.onclick=()=>raCmd({action:'style',id:st.id},st.name+' style on the TV.'); $('raStyles').appendChild(b);
  });
  // Sound
  // The phone's own last setting wins for a few seconds, until the TV's report has caught up
  const vol=()=>{if(raVolSet&&Date.now()-raVolSet.at<6e3)return raVolSet.v;const so=((rmTv()||{}).state||{}).sound;return so?so.vol:.7};
  $('raMute').onclick=()=>{const on=$('raMute').getAttribute('aria-pressed')!=='true';$('raMute').setAttribute('aria-pressed',String(on));raCmd({action:'sound',on},on?'Sound on.':'Sound off.')};
  let volT=null, volNext=null;
  const nudgeVol=d=>{const v=Math.min(1,Math.max(0,Math.round(((volNext??vol())+d)*20)/20));volNext=v;$('raVolOut').textContent=Math.round(v*100)+'%';
    raVolSet={v,at:Date.now()+600};
    clearTimeout(volT);volT=setTimeout(()=>{volNext=null;raVolSet={v,at:Date.now()};raCmd({action:'sound',vol:v},'Volume '+Math.round(v*100)+'%.')},600)};
  $('raVolDown').onclick=()=>nudgeVol(-.1); $('raVolUp').onclick=()=>nudgeVol(.1);
  $('raTest').onclick=()=>raCmd({action:'sound',test:true},'Playing a test on the TV.');
  $('raSndStyle').innerHTML=$('rmSndStyle').innerHTML; $('raChime').innerHTML=$('rmChime').innerHTML;
  $('raSndStyle').onchange=()=>raCmd({action:'sound',style:$('raSndStyle').value,test:true},'Flap sound changed.');
  $('raChime').onchange=()=>raCmd({action:'sound',chime:$('raChime').value,test:true},'Chime changed.');
  $('raAmb').innerHTML=$('sndAmb').innerHTML; $('raAmb').onchange=()=>raCmd({action:'sound',ambient:$('raAmb').value},'Background changed.');
  $('raPerf').onchange=()=>raCmd({action:'perf',perf:$('raPerf').value},'Animation setting changed.');
  $('raTv').onchange=()=>{$('rmTv').value=$('raTv').value;rmRender();raCmd({action:'ping'},'')};
  // Pairing, when no TV is paired yet (or the paired TV stopped answering)
  const say=t=>{$('raPairNote').textContent=t};
  const look=async raw=>{
    const code=frCodeNorm(raw);
    if(!frTvCodeOk(code)){say('The pairing code is the 6 numbers on the TV, like 482 917.');return}
    say('Looking up the code…'); $('raLook').disabled=true;
    try{
      // The relay can take a moment to have a brand-new code, so look twice before giving up
      let inv=await frFetchInvite(code); if(!inv){await new Promise(r=>setTimeout(r,2500));inv=await frFetchInvite(code)}
      if(!inv||inv.kind!=='tv'){say('That code doesn\'t match a TV. Check the code on the TV and try again.');return}
      const old=frLink(inv.id);
      if(old&&!old.pending){raRepair=false;$('rmTv').value=old.id;raRender();return}
      if(old){old.at=Date.now();old.sentAt=Date.now();await frPostSealed(old.topic,old.id,old.ikey,old.hello);say('Connecting to '+inv.name+'…');return}
      await frConnect(inv,'tv',fr.name||'Phone'); say('Connecting to '+inv.name+'…'); rmRender();
    }catch(e){say(e.limit?frLimitMsg():'Couldn\'t reach the relay. Check the phone\'s connection and try again.')}
    finally{$('raLook').disabled=false}
  };
  $('raLook').onclick=()=>look($('raCode').value);
  $('raCode').onkeydown=e=>{if(e.key==='Enter')look($('raCode').value)};
  $('raCode').addEventListener('input',()=>{if(/^\d{6}$/.test(frCodeNorm($('raCode').value)))look($('raCode').value)});
  $('raRepair').onclick=()=>{raRepair=true;say('');$('raCode').value='';raRender()};
  $('raPairBack').onclick=()=>{raRepair=false;say('');raRender()};
  setInterval(()=>{if(rmTvs().some(l=>l.pending))raRender()},4000);
  const m=location.hash.match(/^#pair=([A-Za-z0-9-]+)/);
  if(m){history.replaceState(null,'',location.pathname+location.search);$('raCode').value=frCodeFmt(frCodeNorm(m[1]));look(m[1])}
  const tv=rmTv(); if(tv){frSend(tv,{type:'cmd',action:'ping'}).catch(()=>{});raExpect()}
  document.addEventListener('visibilitychange',()=>{const t=rmTv();if(document.visibilityState==='visible'&&t&&!(t.state&&Date.now()-t.state.at<120e3)){raAsked=0;frSend(t,{type:'cmd',action:'ping'}).catch(()=>{});raExpect()}});
}
function raRender(){
  if(!remoteMode)return;
  const live=rmTvs().filter(l=>!l.pending), tv=rmTv(), st=tv&&tv.state;
  const pairing=!live.length||raRepair;
  $('raPair').hidden=!pairing; $('raMain').hidden=pairing; $('raPairBack').hidden=!live.length;
  const wait=rmTvs().find(l=>l.pending);
  if(pairing&&wait&&!$('raLook').disabled)$('raPairNote').textContent=Date.now()-wait.at<20e3?'Connecting to '+wait.name+'…':'Still connecting. Make sure the code is still showing on the TV; if it isn\'t, choose Pair a phone on the TV and scan the new code.';
  if(st&&st.at>=raAsked)raQuiet=false;
  const quiet=!!tv&&raQuiet;
  $('raStale').hidden=!quiet; $('raStale').firstChild.textContent=frIsLimited()?frLimitMsg():'Can\'t reach the TV. Turn it on and open Ciao Board; the remote reconnects by itself as soon as the board is open.';
  $('raTv').hidden=live.length<2; $('raTvName').hidden=live.length>=2;
  if(live.length>=2){$('raTv').innerHTML=$('rmTv').innerHTML;$('raTv').value=$('rmTv').value}
  $('raTvName').textContent=tv?tv.name:'Ciao Board remote';
  $('raState').textContent=!tv?(rmTvs().length?'Waiting for the TV to confirm…':'Not paired yet'):st?st.showing+' · '+st.style:'Asking the TV what it\'s showing…';
  const mode=st?st.mode:'';
  document.querySelectorAll('.ra-grid button').forEach(b=>{const k=b.dataset.ra;b.classList.toggle('on',k==='plan'?!!(st&&st.plan):k===({clock:'clock',news:'news',art:'art',rotating:'saved'}[mode])||raOpen===k)});
  $('raPlanLbl').textContent=st&&st.plan?'Stop day plan':'Day plan';
  $('raNewsChips').hidden=raOpen!=='news'; $('raArtChips').hidden=raOpen!=='art';
  if(raOpen==='news')raChips($('raNewsChips'),[...$('newsSection').options].map(o=>[o.value,o.textContent]),mode==='news'?st.section:'',(v,l)=>{raCmd({action:'news',section:v},'BBC '+l.toLowerCase()+' on the TV.');raOpen=null;raRender()});
  if(raOpen==='art')raChips($('raArtChips'),ART.map(a=>[a.id,a.name]),st&&(mode==='art'||/^Art: /.test(st.showing))?st.art:'',(v,l)=>{raCmd({action:'art',id:v},l+' on the TV.');raOpen=null;raRender()});
  document.querySelectorAll('#raStyles button').forEach(b=>b.classList.toggle('on',!!st&&b.dataset.id===st.styleId));
  const so=st&&st.sound;
  if(so){$('raMute').setAttribute('aria-pressed',String(!!so.on));$('raMute').textContent=so.on?'Sound on':'Sound off';$('raMute').classList.toggle('on',!!so.on);$('raVolOut').textContent=Math.round((raVolSet&&Date.now()-raVolSet.at<6e3?raVolSet.v:so.vol)*100)+'%';
    if(so.style)$('raSndStyle').value=so.style;if(so.chime)$('raChime').value=so.chime;if(so.ambient)$('raAmb').value=so.ambient}
  if(st)$('raPerf').value=st.perf;
  if(so&&so.blocked&&!raBlockedSaid){raBlockedSaid=true;raNote('The TV is holding its sound back until someone presses OK on the TV remote.')}
  if(so&&!so.blocked)raBlockedSaid=false;
}
function rmRender(){
  const tvs=rmTvs(), live=tvs.filter(l=>!l.pending), sel=$('rmTv'), keep=sel.value;
  sel.innerHTML=''; live.forEach(l=>{const o=document.createElement('option');o.value=l.id;o.textContent=l.name;sel.appendChild(o)});
  if(live.some(l=>l.id===keep))sel.value=keep;
  $('rmControls').hidden=!live.length; $('rmTvField').hidden=live.length<2;
  const tv=rmTv(), st=tv&&tv.state;
  $('rmState').textContent=!tv?'':st?'Showing '+st.showing+' · '+st.style+(st.plan?' · day plan running':''):'Asking '+tv.name+' what it\'s showing…';
  if(st){const s=BOARD_STYLES.find(x=>x.name===st.style);$('rmStyle').value=s?s.id:''}
  const so=st&&st.sound;
  if(so){
    $('rmSndOn').setAttribute('aria-pressed',String(!!so.on)); $('rmSndOn').textContent=so.on?'Sound on':'Sound off'; $('rmSndOn').classList.toggle('on',!!so.on);
    if(document.activeElement!==$('rmVol')){$('rmVol').value=so.vol;$('rmVolOut').textContent=Math.round(so.vol*100)+'%'}
    if(so.style)$('rmSndStyle').value=so.style; if(so.chime)$('rmChime').value=so.chime;
  }
  $('rmSndNote').textContent=so&&so.blocked?'The TV\'s browser is holding the sound back until someone presses a button on the TV. Press OK on the TV remote once.':'';
  if(st)$('rmPerf').value=st.perf;
  const ul=$('rmList'); ul.innerHTML='';
  const all=[...tvs.map(l=>[l,'TV you control']),...rmPhones().map(l=>[l,'phone that controls this board'])];
  if(!all.length)ul.innerHTML='<li class="hint">Nothing paired yet.</li>';
  all.forEach(([l,what])=>{
    const li=document.createElement('li');
    const t=document.createElement('span'); t.className='txt'; t.textContent=l.name+' · '+what+(l.pending?' (waiting to confirm)':'');
    const x=document.createElement('button'); x.type='button'; x.className='x'; x.textContent='Unpair'; x.setAttribute('aria-label','Unpair '+l.name);
    x.onclick=()=>{if(!confirm('Unpair '+l.name+'?'))return;if(!l.pending)frSend(l,{type:'bye'}).catch(()=>{});fr.links=fr.links.filter(k=>k.id!==l.id);saveFr();rmRender()};
    li.append(t,x); ul.appendChild(li);
  });
  $('rmOpenApp').hidden=!tvs.some(l=>!l.pending);
  raRender();
  try{updateSubs()}catch(e){}
}

