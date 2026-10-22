// What the board shows: messages, saved messages, clock, weather, surf, calendar and news.
// Message input
const msg=$('msgBox');
// Color tiles show as colored squares while typing; stored and sent as {y} tokens.
const EMO={r:'🟥',o:'🟧',y:'🟨',g:'🟩',b:'🟦',v:'🟪',w:'⬜'};
const REV=Object.fromEntries(Object.entries(EMO).map(([k,v])=>[v,k]));
const EMO_RE=/(🟥|🟧|🟨|🟩|🟦|🟪|⬜)\uFE0F?/gu;
const toEmoji=t=>String(t).replace(/\{([roygbvw])\}/gi,(m,c)=>EMO[c.toLowerCase()]);
const fromEmoji=t=>String(t).replace(EMO_RE,(m,e)=>'{'+REV[e]+'}');
const getMsg=()=>fromEmoji(msg.value);
function liveTokens(el){
  if(!/\{[roygbvw]\}/i.test(el.value))return;
  const p=el.selectionStart??el.value.length, before=toEmoji(el.value.slice(0,p));
  el.value=before+toEmoji(el.value.slice(p)); el.selectionStart=el.selectionEnd=before.length;
}
function tokenSpans(el,text){
  el.textContent='';
  String(text).split(/(\{[roygbvw]\})/i).forEach(part=>{
    const m=part.match(/^\{([roygbvw])\}$/i);
    if(m){const q=document.createElement('span');q.className='sq';q.style.background='var(--c-'+m[1].toLowerCase()+')';el.appendChild(q)}
    else if(part)el.appendChild(document.createTextNode(part));
  });
}
const draft=store.get('fb.draft',null); msg.value=toEmoji(draft!=null?draft:msg.value);
const pvCells=[]; for(let i=0;i<COLS*ROWS;i++){const c=document.createElement('i');$('pv').appendChild(c);pvCells.push(c)}
function renderPreview(){
  const {cells}=toTargets(getMsg());
  cells.forEach((idx,i)=>{const ch=CHARS[idx],c=pvCells[i];if(ch.length===3){c.style.background='var('+COLORS[ch[1]]+')';c.textContent=''}else{c.style.background='';c.textContent=ch===' '?'':ch}});
}
function updateCount(){
  const n=layout(getMsg()).length, over=n-ROWS;
  $('count').textContent=over>0?n+' lines, '+over+' won’t fit':n+' of 6 lines';
  $('count').classList.toggle('over',over>0); renderPreview();
}
msg.addEventListener('input',()=>{liveTokens(msg);store.set('fb.draft',getMsg());updateCount()});
msg.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)){e.preventDefault();manualSend()}});
document.querySelectorAll('#pane-message .chip').forEach(b=>b.onclick=()=>{
  const tok=EMO[b.dataset.c]; const s=msg.selectionStart??msg.value.length, e=msg.selectionEnd??s;
  msg.value=msg.value.slice(0,s)+tok+msg.value.slice(e); msg.focus(); msg.selectionStart=msg.selectionEnd=s+tok.length;
  store.set('fb.draft',getMsg()); updateCount();
});
function manualSend(){stopModes();send(getMsg())}
$('sendBtn').onclick=manualSend;
$('clearBtn').onclick=()=>{stopModes();send('')};

// Toast with undo
let toastT=null;
function toast(text,undo){
  const t=$('toast'); $('toastMsg').textContent=text; t.hidden=false;
  $('toastUndo').hidden=!undo; $('toastUndo').onclick=()=>{t.hidden=true;clearTimeout(toastT);if(undo)undo()};
  clearTimeout(toastT); toastT=setTimeout(()=>{t.hidden=true},5000);
}

// Saved messages
const DEFAULTS=['{g}{g} SURF REPORT {g}{g}\nMALIBU - FAIR\n3-4 FT\nSWELL 3 FT 15S SSW\nWIND 6 MPH OFFSHORE\nLOW TIDE 1:12 PM','NEXT UP\n\nSCHOOL PICKUP\nTODAY 3:15 PM\nIN 45 MIN','TODAY\n\n9:30AM DENTIST\n12PM LUNCH WITH JO\n5PM SOCCER PRACTICE','{b} DAWN PATROL {b}\nVENICE BREAKWATER\nWHEELS UP 6:15 AM','COUNTING DOWN\n\n12 DAYS TO MAUI\n3 DAYS TO SURF CAMP','{v}{v} GOODNIGHT {v}{v}\nHIGH TIDE 6:45 AM\nGLASSY AT DAWN'];
let saved=store.get('fb.saved',DEFAULTS);
function renderSaved(){
  const ul=$('saved'); ul.innerHTML='';
  if(!saved.length){ul.innerHTML='<li class="hint">No saved messages yet. Write one and tap Save message.</li>';return}
  saved.forEach((m,i)=>{
    const li=document.createElement('li');
    const txt=document.createElement('span'); txt.className='txt'; tokenSpans(txt,m.replace(/\n/g,' / ').toUpperCase());
    const show=document.createElement('button'); show.type='button'; show.className='show'; show.textContent='Show';
    show.onclick=()=>{stopModes();msg.value=toEmoji(m);store.set('fb.draft',m);updateCount();send(m)};
    const del=document.createElement('button'); del.type='button'; del.className='x'; del.textContent='Delete'; del.setAttribute('aria-label','Delete saved message');
    del.onclick=()=>{const gone=saved.splice(i,1)[0];store.set('fb.saved',saved);renderSaved();try{updateSubs()}catch(e){}toast('Message deleted',()=>{saved.splice(i,0,gone);store.set('fb.saved',saved);renderSaved()})};
    li.append(txt,show,del); ul.appendChild(li);
  });
}
$('saveBtn').onclick=()=>{const v=getMsg().trim();if(!v)return;if(saved.includes(v)){$('saveBtn').textContent='Already saved';setTimeout(()=>$('saveBtn').textContent='Save message',1400);return}saved.unshift(v);store.set('fb.saved',saved);renderSaved();$('saveBtn').textContent='Saved';setTimeout(()=>$('saveBtn').textContent='Save message',1200)};
renderSaved();

// Modes
let mode='', timer=null, rotIdx=0, lastClock='';
function stopModes(){clearInterval(timer);timer=null;mode='';store.set('fb.mode','');$('rotateBtn').classList.remove('on');$('clockBtn').classList.remove('on');const wb=document.getElementById('wxBtn');if(wb)wb.classList.remove('on');const sb=document.getElementById('surfBtn');if(sb)sb.classList.remove('on');const cb=document.getElementById('calBtn');if(cb)cb.classList.remove('on');$('newsBtn').classList.remove('on');$('artStop').hidden=true;document.querySelectorAll('.artcard[aria-pressed="true"]').forEach(b=>b.setAttribute('aria-pressed','false'));if(typeof calStop==='function')calStop();if(!schedDriving&&typeof schedOff==='function')schedOff();setStatus(busy?'Flipping':'Showing')}
$('rotateBtn').onclick=()=>{
  if(mode==='rotating'){stopModes();return}
  if(!saved.length)return;
  stopModes(); mode='rotating'; store.set('fb.mode','rotating'); $('rotateBtn').classList.add('on');
  const go=()=>{send(saved[rotIdx%saved.length]);rotIdx++};
  go(); timer=setInterval(go,+$('rotateEvery').value*1000);
};
$('rotateEvery').onchange=()=>{if(mode==='rotating'){mode='';$('rotateBtn').click()}};
const clk=Object.assign({hours:'12',ampm:true,date:'long',border:'none',accent:'none',tz:'',label:'',order:'time'},store.get('fb.clock',{}));
const TZ_NAMES={'America/New_York':'NEW YORK','America/Chicago':'CHICAGO','America/Denver':'DENVER','America/Los_Angeles':'LOS ANGELES','Pacific/Honolulu':'HONOLULU','Europe/London':'LONDON','Europe/Paris':'PARIS','Europe/Berlin':'BERLIN','Europe/Oslo':'OSLO','Asia/Dubai':'DUBAI','Asia/Kolkata':'MUMBAI','Asia/Tokyo':'TOKYO','Australia/Sydney':'SYDNEY'};
function hm(d,tz){
  if(!tz)return [d.getHours(),d.getMinutes()];
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:tz,hour:'numeric',minute:'numeric',hourCycle:'h23'}).formatToParts(d);
  const get=t=>+((parts.find(x=>x.type===t)||{}).value||0);
  return [get('hour')%24,get('minute')];
}
function fmtTime(d,tz){
  const [h,m]=hm(d,tz); const mm=String(m).padStart(2,'0');
  if(clk.hours==='24')return String(h).padStart(2,'0')+':'+mm;
  return (h%12||12)+':'+mm+(clk.ampm?(h<12?' AM':' PM'):'');
}
function clockText(){
  const d=new Date();
  const dot=clk.accent!=='none'?'{'+clk.accent+'} ':'';
  const time=dot+fmtTime(d)+(dot?' '+dot.trim():'');
  let date='';
  if(clk.date==='long')date=d.toLocaleDateString('en-US',{weekday:'long'})+' '+d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  else if(clk.date==='full')date=d.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
  else if(clk.date==='short')date=d.toLocaleDateString('en-US',{weekday:'short'})+' '+(d.getMonth()+1)+'/'+d.getDate();
  else if(clk.date==='day')date=d.toLocaleDateString('en-US',{weekday:'long'});
  const extra=[];
  if(clk.label.trim())extra.push(clk.label.trim());
  if(clk.tz)extra.push(TZ_NAMES[clk.tz]+' '+fmtTime(d,clk.tz));
  let core=clk.order==='date'&&date?[date,time]:[time].concat(date?[date]:[]);
  core=core.concat(extra);
  const bordered=clk.border!=='none';
  if(core.length>1&&core.length+(bordered?2:0)<=5)core.splice(1,0,'');
  if(bordered&&core.length+2<=ROWS){const row='{'+clk.border+'}';const full=Array(COLS).fill(row).join('');core=[full,...core,full]}
  return core.join('\n');
}
let goClock=null;
function renderClock(){
  $('clkHours').value=clk.hours; $('clkAmpm').checked=clk.ampm; $('clkAmpm').disabled=clk.hours==='24';
  $('clkDate').value=clk.date; $('clkBorder').value=clk.border; $('clkAccent').value=clk.accent;
  $('clkTz').value=clk.tz; $('clkLabel').value=clk.label; $('clkOrder').value=clk.order;
}
function clockChanged(){store.set('fb.clock',clk);renderClock();if(mode==='clock'&&goClock){lastClock='';goClock()}else startClock()}
[['clkHours','hours'],['clkDate','date'],['clkBorder','border'],['clkAccent','accent'],['clkTz','tz'],['clkOrder','order']].forEach(([id,k])=>{$(id).onchange=()=>{clk[k]=$(id).value;clockChanged()}});
$('clkAmpm').onchange=()=>{clk.ampm=$('clkAmpm').checked;clockChanged()};
$('clkLabel').oninput=()=>{clk.label=$('clkLabel').value.slice(0,22);store.set('fb.clock',clk)};
$('clkLabel').onchange=clockChanged;
renderClock();
function startClock(){
  stopModes(); mode='clock'; store.set('fb.mode','clock'); $('clockBtn').classList.add('on'); lastClock='';
  goClock=()=>{const c=clockText();if(c!==lastClock){lastClock=c;send(c)}};
  goClock(); timer=setInterval(goClock,5000); setStatus(busy?'Flipping':'Showing');
}
$('clockBtn').onclick=()=>{if(mode==='clock')stopModes();else startClock()};

// Weather (AccuWeather connector)
const WX='AccuWeather';
const wx=Object.assign({cities:[{name:'Santa Monica, CA',key:'337241'}],show:'all',every:60,unit:'imperial',detail:'rain',tile:false},store.get('fb.wx',{}));
const saveWx=()=>store.set('fb.wx',wx);
let mcpP=null, wxIdx=0, wxRefresh=null, wxShownOnce=false;
function getMcp(){
  if(!mcpP)mcpP=useCap('mcp').then(m=>{if(!m)mcpP=null;return m});
  return mcpP;
}
getMcp();
async function wxCall(tool,q){
  const mcp=await getMcp(); if(!mcp)throw {code:'unavailable'};
  const r=await mcp.callTool(WX,tool,{queryParams:q},{cache:{staleTime:600000,gcTime:3600000}});
  return r.payload||{};
}
function wxError(e){
  const c=(e&&e.code)||'upstream_error';
  const msgs={
    unavailable:'Weather works when this board is open in Claude (the app or claude.ai).',
    server_not_connected:'Add AccuWeather in claude.ai Settings → Connectors, then tap Weather again.',
    selection_required:'Choose which AccuWeather connection to use, then tap Weather again.',
    needs_reauth:'Reconnect AccuWeather in claude.ai Settings → Connectors.',
    not_in_manifest:'Weather is turned off for this board. Allow AccuWeather in the board’s permissions, then tap Weather again.',
    approval_required:'Tap Weather again and allow AccuWeather when Claude asks.',
    consent_required:'Tap Weather again and allow AccuWeather when Claude asks.',
    blocked_by_policy:'Your organization blocks AccuWeather here.',
    tool_error:'AccuWeather couldn’t load that city. Try removing and re-adding it.',
    server_unavailable:'AccuWeather didn’t answer. The board will try again at the next update.'
  };
  return msgs[c]||'AccuWeather didn’t answer. The board will try again at the next update.';
}
function wxSetStatus(t){$('wxStatus').textContent=t}
const num=v=>{const n=parseFloat(String(v).replace(/[^\d.-]/g,''));return isNaN(n)?null:Math.round(n)};
async function wxFetch(city){
  const q={locationKey:city.key,unit:wx.unit};
  const [cur,daily]=await Promise.all([wxCall('widgets-current-claude',q),wxCall('widgets-daily-claude',q)]);
  const cc=cur.currentConditions||{}; const d0=(daily.dailyForecast||[])[0]||{}; const d1=(daily.dailyForecast||[])[1]||{};
  return {
    name:((cur.location&&cur.location.localizedName)||city.name.split(',')[0]),
    temp:num(cc.temperatureValue??cc.temperature), phrase:cc.phrase||(d0.day&&d0.day.phrase)||'',
    icon:+(cc.iconCode||(d0.day&&d0.day.icon)||0), feels:num(cc.realFeelValue??cc.realFeel),
    wind:(cc.extended&&cc.extended.wind)||'', hi:num(d0.day&&d0.day.temperature), lo:num(d0.night&&d0.night.temperature),
    rain:num(d0.day&&(d0.day.rainProbabilityValue??d0.day.precip)),
    tHi:num(d1.day&&d1.day.temperature), tPhrase:(d1.day&&d1.day.phrase)||''
  };
}
function wxTileFor(icon){
  if(!wx.tile||!icon)return '';
  let c='w';
  if(icon<=5||icon===30)c=icon===30?'r':'y';
  else if([15,16,17,41,42].includes(icon))c='v';
  else if([12,13,14,18,26,29,39,40].includes(icon))c='b';
  else if(icon===31)c='b'; else if(icon===32)c='g';
  else if(icon>=33)c='v';
  return '{'+c+'} ';
}
function fit(t,n){t=String(t||'').trim();if(t.length<=n)return t;const cut=t.slice(0,n+1).lastIndexOf(' ');let r=(cut>n*0.5?t.slice(0,cut):t.slice(0,n)).trim();for(let i=0;i<2;i++)r=r.replace(/\s+(w\/|and|with|a|of|the|then)$/i,'');return r}
function wxText(d){
  const lines=[fit(d.name,COLS),''];
  const t=d.temp!=null?d.temp+'°':'';
  const main=wxTileFor(d.icon)+t;
  if((t+' '+d.phrase).length<=COLS-(wx.tile?2:0))lines.push(main+' '+d.phrase); else{lines.push(main);lines.push(fit(d.phrase,COLS))}
  if(d.hi!=null&&d.lo!=null)lines.push('HI '+d.hi+'°  LO '+d.lo+'°');
  if(wx.detail==='rain'&&d.rain!=null)lines.push('RAIN '+d.rain+'%');
  else if(wx.detail==='feels'&&d.feels!=null)lines.push('FEELS LIKE '+d.feels+'°');
  else if(wx.detail==='wind'&&d.wind)lines.push(fit('WIND '+d.wind,COLS));
  else if(wx.detail==='tomorrow'&&d.tHi!=null)lines.push(fit('TMRW '+d.tHi+'° '+d.tPhrase,COLS));
  while(lines.length>ROWS&&lines.includes(''))lines.splice(lines.indexOf(''),1);
  return lines.slice(0,ROWS).join('\n');
}
function wxCurrentList(){return wx.show==='all'?wx.cities:wx.cities.filter(c=>c.key===wx.show)}
async function wxShowNext(){
  const list=wxCurrentList(); if(!list.length){wxSetStatus('Add a city below to show its weather.');return}
  const city=list[wxIdx%list.length]; wxIdx++;
  wxSetStatus('Loading '+city.name+'…');
  if(!wxShownOnce)send('WEATHER\n\nLOADING\n'+fit(city.name.split(',')[0],COLS));
  try{
    const d=await wxFetch(city);
    if(mode!=='weather')return;
    send(wxText(d)); wxShownOnce=true;
    wxSetStatus('Showing '+city.name+' · updated '+new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}));
  }catch(e){ if(mode==='weather'){wxSetStatus(wxError(e));if(!wxShownOnce)send('WEATHER\n\nCOULDN\'T LOAD\nSEE NOTE BELOW BOARD')} }
}
function startWeather(){
  stopModes(); mode='weather'; store.set('fb.mode','weather'); $('wxBtn').classList.add('on'); setStatus(busy?'Flipping':'Showing');
  wxIdx=0; wxShownOnce=false; wxShowNext();
  const list=wxCurrentList();
  timer=setInterval(wxShowNext,(list.length>1?wx.every:600)*1000);
}
function restartWeather(){if(mode==='weather')startWeather()}
$('wxBtn').onclick=()=>{if(mode==='weather')stopModes();else startWeather()};
function renderWx(){
  const sel=$('wxCity'); sel.innerHTML='';
  const all=document.createElement('option'); all.value='all'; all.textContent=wx.cities.length>1?'All cities, one at a time':'All cities'; sel.appendChild(all);
  wx.cities.forEach(c=>{const o=document.createElement('option');o.value=c.key;o.textContent=c.name;sel.appendChild(o)});
  if(wx.show!=='all'&&!wx.cities.some(c=>c.key===wx.show))wx.show='all';
  sel.value=wx.show; $('wxEvery').value=wx.every; $('wxUnit').value=wx.unit; $('wxDetail').value=wx.detail; $('wxTile').checked=wx.tile;
  const ul=$('wxCities'); ul.innerHTML='';
  if(!wx.cities.length){ul.innerHTML='<li class="hint">No cities yet. Search for one below.</li>'}
  wx.cities.forEach((c,i)=>{
    const li=document.createElement('li');
    const t=document.createElement('span'); t.className='txt'; t.textContent=c.name.toUpperCase();
    const del=document.createElement('button'); del.type='button'; del.className='x'; del.textContent='Remove';
    del.onclick=()=>{wx.cities.splice(i,1);saveWx();renderWx();restartWeather()};
    li.append(t,del); ul.appendChild(li);
  });
}
[['wxCity','show'],['wxEvery','every'],['wxUnit','unit'],['wxDetail','detail']].forEach(([id,k])=>{$(id).onchange=()=>{wx[k]=k==='every'?+$(id).value:$(id).value;saveWx();if(mode==='weather')restartWeather();else startWeather()}});
$('wxTile').onchange=()=>{wx.tile=$('wxTile').checked;saveWx();if(mode==='weather')restartWeather();else startWeather()};
async function wxSearch(){
  const q=$('wxQuery').value.trim(); if(!q)return;
  const ul=$('wxResults'); ul.hidden=false; ul.innerHTML='<li class="hint">Searching…</li>';
  try{
    const p=await wxCall('widgets-search-claude',{query:q});
    const res=(p.results||[]).filter(r=>r&&r.locationKey);
    ul.innerHTML='';
    if(!res.length){ul.innerHTML='<li class="hint">No places found for that search. Try a city name with its state or country.</li>';return}
    res.slice(0,8).forEach(r=>{
      const li=document.createElement('li');
      const t=document.createElement('span'); t.className='txt'; t.textContent=String(r.name||'').toUpperCase();
      const add=document.createElement('button'); add.type='button';
      const have=wx.cities.some(c=>c.key===String(r.locationKey));
      add.textContent=have?'Added':'Add'; add.disabled=have;
      add.onclick=()=>{wx.cities.push({name:String(r.name||'City'),key:String(r.locationKey)});saveWx();renderWx();ul.hidden=true;$('wxQuery').value='';restartWeather()};
      li.append(t,add); ul.appendChild(li);
    });
  }catch(e){ul.innerHTML='';const li=document.createElement('li');li.className='hint';li.textContent=wxError(e);ul.appendChild(li)}
}
$('wxFind').onclick=wxSearch;
$('wxQuery').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();wxSearch()}});
renderWx();

// Surf (reports written to the board's database by a scheduled task)
const surf=Object.assign({spot:'all',every:60,swell:true,wind:true,water:true,tide:true,tile:false},store.get('fb.surf',{}));
const saveSurf=()=>store.set('fb.surf',surf);
const SPOTS=['malibu','venice'];
const surfData={}; let surfPlaceholder=false, surfIdx=0, surfListening=false, surfDbState='loading';
function surfSetStatus(t){$('surfStatus').textContent=t}
function surfAge(r){
  const t=Date.parse(r&&r.updatedAt); if(isNaN(t))return '';
  return new Date(t).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
}
async function surfListen(){
  if(surfListening)return; surfListening=true;
  const db=await useCap('db');
  if(!db){surfDbState='none';surfListening=false;if(mode==='surf')send('SURF\n\nCOULDN\'T LOAD\nSEE NOTE BELOW BOARD');if(mode==='surf')surfSetStatus('Surf reports show when this board is open in Claude (the app or claude.ai).');return}
  db.collection('surf').onSnapshot(snap=>{
    snap.docs.forEach(d=>{if(d.exists)surfData[d.id]=d.data()});
    surfDbState='ready';
    if(mode==='surf'){if(surfLastShown&&surfData[surfLastShown])showSurf(surfLastShown,true);else if(!surfLastShown)surfNext()}
  },e=>{surfDbState='error';surfListening=false;if(mode==='surf')surfSetStatus('Surf reports couldn’t load. Tap Surf to try again.')});
}
surfListen();
const RATING_TILE={flat:'w',poor:'r','poor to fair':'o',fair:'y','fair to good':'g',good:'g',epic:'v'};
let surfLastShown='', surfLastText='';
function surfText(r){
  const lines=[];
  const q=String(r.quality||'').toUpperCase();
  const tile=surf.tile?((RATING_TILE[String(r.quality||'').toLowerCase()]&&'{'+RATING_TILE[String(r.quality||'').toLowerCase()]+'} ')||''):'';
  lines.push(fit(tile+String(r.name||'').toUpperCase()+(q?' - '+q:''),COLS+(tile?2:0)));
  lines.push(fit(String(r.height||'').toUpperCase(),COLS));
  if(surf.swell&&r.swell)lines.push(fit('SWELL '+r.swell,COLS));
  if(surf.wind&&r.wind)lines.push(fit('WIND '+r.wind,COLS));
  if(surf.water&&r.water)lines.push(fit('WATER '+r.water,COLS));
  if(surf.tide&&r.tide)lines.push(fit(r.tide,COLS));
  if(lines.length<=4)lines.splice(1,0,'');
  return lines.slice(0,ROWS).join('\n');
}
function showSurf(id,quiet){
  const r=surfData[id]; if(!r)return false;
  const t=surfText(r); surfLastShown=id;
  if(t!==surfLastText||!quiet){surfLastText=t;send(t)}
  const age=surfAge(r);
  const old=Date.now()-Date.parse(r.updatedAt)>6*3600*1000;
  surfSetStatus('Showing '+(r.name||id)+(age?' · report from '+age:'')+(old?'. This report is more than 6 hours old.':''));
  return true;
}
function surfNext(){
  const ids=surf.spot==='all'?SPOTS:[surf.spot];
  if(surfDbState==='none'){surfSetStatus('Surf reports show when this board is open in Claude (the app or claude.ai).');return}
  for(let i=0;i<ids.length;i++){
    const id=ids[surfIdx%ids.length]; surfIdx++;
    if(showSurf(id))return;
  }
  surfSetStatus(surfDbState==='loading'?'Loading surf reports…':'No surf report yet. The next update will fill it in.');
  if(!surfLastShown&&surfDbState==='loading'&&!surfPlaceholder){surfPlaceholder=true;send('SURF\n\nLOADING REPORTS')}
}
function startSurf(){
  stopModes(); mode='surf'; store.set('fb.mode','surf'); $('surfBtn').classList.add('on'); setStatus(busy?'Flipping':'Showing');
  surfIdx=0; surfLastText=''; surfLastShown=''; surfPlaceholder=false; if(!surfListening)surfListen();
  surfNext();
  const ids=surf.spot==='all'?SPOTS:[surf.spot];
  timer=setInterval(()=>{if(ids.length>1)surfNext();else if(!surfLastShown)surfNext()},(ids.length>1?surf.every:20)*1000);
}
$('surfBtn').onclick=()=>{if(mode==='surf')stopModes();else startSurf()};
function renderSurf(){
  $('surfSpot').value=surf.spot; $('surfEvery').value=surf.every;
  ['swell','wind','water','tide','tile'].forEach(k=>{$('surf'+k[0].toUpperCase()+k.slice(1)).checked=surf[k]});
}
$('surfSpot').onchange=()=>{surf.spot=$('surfSpot').value;saveSurf();startSurf()};
$('surfEvery').onchange=()=>{surf.every=+$('surfEvery').value;saveSurf();startSurf()};
['swell','wind','water','tide','tile'].forEach(k=>{const el=$('surf'+k[0].toUpperCase()+k.slice(1));el.onchange=()=>{surf[k]=el.checked;saveSurf();startSurf()}});
renderSurf();

// Calendar (Google Calendar connector)
const GC='Google Calendar';
const cal=Object.assign({next:true,today:true,tomorrow:true,count:true,every:30,allDay:true,countdowns:[]},store.get('fb.cal',{}));
const saveCal=()=>store.set('fb.cal',cal);
let calEvents=null, calFetchedAt=0, calErr=null, calViewIdx=0, calTick=null, calRotate=null, calLastText='', calLoading=false;
const pad2=n=>String(n).padStart(2,'0');
const localIso=d=>d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate())+'T'+pad2(d.getHours())+':'+pad2(d.getMinutes())+':00';
const dayStart=d=>new Date(d.getFullYear(),d.getMonth(),d.getDate());
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
function calSetStatus(t){$('calStatus').textContent=t}
function calError(e){
  const c=(e&&e.code)||'upstream_error';
  const msgs={
    unavailable:'The calendar works when this board is open in Claude (the app or claude.ai).',
    not_granted:'The calendar works when this board is open in Claude (the app or claude.ai).',
    capability_disabled:'The calendar works when this board is open in Claude (the app or claude.ai).',
    server_not_connected:'Add Google Calendar in claude.ai Settings → Connectors, then tap Show calendar again.',
    selection_required:'Choose which Google Calendar connection to use, then tap Show calendar again.',
    needs_reauth:'Reconnect Google Calendar in claude.ai Settings → Connectors.',
    not_in_manifest:'Google Calendar is turned off for this board. Allow it in the board’s permissions, then tap Show calendar again.',
    approval_required:'Tap Show calendar and allow Google Calendar when Claude asks.',
    consent_required:'Tap Show calendar and allow Google Calendar when Claude asks.',
    blocked_by_policy:'Your organization blocks Google Calendar here.',
    tool_error:'Google Calendar couldn’t read your events. The board will try again in a few minutes.',
    server_unavailable:'Google Calendar didn’t answer. The board will try again in a few minutes.'
  };
  return msgs[c]||'Google Calendar didn’t answer. The board will try again in a few minutes.';
}
function parseEvent(ev){
  const title=String(ev.summary||'Busy'); const st=ev.start||{}, en=ev.end||{};
  if(st.dateTime){const s=new Date(st.dateTime); if(isNaN(s))return null; const e=en.dateTime?new Date(en.dateTime):new Date(s.getTime()+3600000); return {title,start:s,end:e,allDay:false}}
  if(st.date){const ymd=v=>{const [y,m,d]=String(v).slice(0,10).split('-').map(Number);return new Date(y,m-1,d)}; const s=ymd(st.date); if(isNaN(s))return null; const e=en.date?ymd(en.date):addDays(s,1); return {title,start:s,end:e,allDay:true}}
  return null;
}
async function calLoad(force){
  if(calLoading)return; calLoading=true;
  try{
    const mcp=await getMcp(); if(!mcp){calErr={code:'unavailable'};return}
    const s=dayStart(new Date());
    const r=await mcp.callTool(GC,'list_events',{startTime:localIso(s),endTime:localIso(addDays(s,8)),orderBy:'startTime',pageSize:100},{cache:force?{staleTime:0,gcTime:3600000,refresh:true}:{staleTime:240000,gcTime:3600000}});
    const p=r.payload||{};
    calEvents=(Array.isArray(p.events)?p.events:[])
      .filter(ev=>ev&&ev.status!=='cancelled'&&!(ev.attendees||[]).some(a=>a&&a.self&&a.responseStatus==='declined'))
      .map(parseEvent).filter(Boolean).sort((a,b)=>a.start-b.start);
    calFetchedAt=(r.cache&&r.cache.storedAt)||Date.now(); calErr=null;
  }catch(err){
    calErr=err||{code:'upstream_error'};
    if(['needs_reauth','server_not_connected','not_in_manifest','blocked_by_policy','approval_required','consent_required','selection_required'].includes(calErr.code))calEvents=null;
  }finally{calLoading=false}
}
const UP=s=>String(s).toUpperCase();
function fmtCompact(d){
  const h=d.getHours(), m=d.getMinutes();
  if(clk.hours==='24')return pad2(h)+':'+pad2(m);
  return (h%12||12)+(m?':'+pad2(m):'')+(h<12?'AM':'PM');
}
function dayWord(d){
  const diff=Math.round((dayStart(d)-dayStart(new Date()))/86400000);
  if(diff===0)return 'TODAY'; if(diff===1)return 'TOMORROW';
  return UP(d.toLocaleDateString('en-US',{weekday:'long'}));
}
function untilText(ms){
  const mins=Math.round(ms/60000);
  if(mins<1)return 'STARTING NOW';
  if(mins<60)return 'IN '+mins+' MIN';
  const h=Math.floor(mins/60), m=mins%60;
  if(h<36)return 'IN '+h+' HR'+(m&&h<10?' '+m+' MIN':'');
  return 'IN '+Math.round(ms/86400000)+' DAYS';
}
const CAL_FAIL='CALENDAR\n\nCOULDN\'T LOAD\nSEE NOTE BELOW BOARD';
function needEvents(){if(calEvents)return null;return calErr?CAL_FAIL:'CALENDAR\n\nLOADING'}
function viewNext(){
  const w=needEvents(); if(w)return w;
  const now=new Date();
  const ev=calEvents.find(e=>!e.allDay&&e.end>now);
  if(!ev)return 'NEXT UP\n\nNOTHING SCHEDULED\nTHIS WEEK';
  const title=UP(ev.title); const two=layout(title).length>1;
  const lines=ev.start<=now
    ?['HAPPENING NOW',...(two?[]:['']),title,'UNTIL '+fmtTime(ev.end)]
    :['NEXT UP',...(two?[]:['']),title,dayWord(ev.start)+' '+fmtTime(ev.start),untilText(ev.start-now)];
  return lines.join('\n');
}
function dayList(offset){
  const now=new Date(), s=addDays(dayStart(now),offset), e=addDays(s,1);
  return calEvents.filter(ev=>ev.start<e&&ev.end>s&&(cal.allDay||!ev.allDay)&&(offset>0||ev.allDay||ev.end>now));
}
function listLines(evs,max){
  const out=[];
  const all=evs.filter(e=>e.allDay), timed=evs.filter(e=>!e.allDay);
  [...all,...timed].forEach(ev=>out.push(fit(ev.allDay?UP(ev.title):fmtCompact(ev.start)+' '+UP(ev.title),COLS)));
  if(out.length>max){const more=out.length-(max-1);out.splice(max-1);out.push('+'+more+' MORE')}
  return out;
}
function viewToday(){
  const w=needEvents(); if(w)return w;
  const d=new Date(); const head=UP(d.toLocaleDateString('en-US',{weekday:'long'}))+' '+UP(d.toLocaleDateString('en-US',{month:'short',day:'numeric'}));
  const evs=dayList(0);
  if(!evs.length)return head+'\n\nNOTHING ELSE\nON THE CALENDAR';
  const lines=listLines(evs,5);
  return [head,...(lines.length<=3?['']:[]),...lines].join('\n');
}
function viewTomorrow(){
  const w=needEvents(); if(w)return w;
  const evs=dayList(1);
  if(!evs.length)return 'TOMORROW\n\nNOTHING ON\nTHE CALENDAR';
  const lines=listLines(evs,5);
  return ['TOMORROW',...(lines.length<=3?['']:[]),...lines].join('\n');
}
function cdDays(c){const [y,m,d]=String(c.date).split('-').map(Number);return Math.round((new Date(y,m-1,d)-dayStart(new Date()))/86400000)}
function cdUpcoming(){return cal.countdowns.filter(c=>cdDays(c)>=0).sort((a,b)=>cdDays(a)-cdDays(b))}
function viewCount(){
  const lines=cdUpcoming().slice(0,5).map(c=>{const n=cdDays(c),nm=UP(c.name);return fit(n===0?'TODAY: '+nm:n===1?'TOMORROW: '+nm:n+' DAYS TO '+nm,COLS)});
  if(!lines.length)return 'COUNTDOWNS\n\nADD ONE IN THE\nCALENDAR TAB';
  return (lines.length<=3?['COUNTING DOWN','',...lines]:lines.length===4?['COUNTING DOWN',...lines]:lines).join('\n');
}
function calViews(){
  const v=[];
  if(cal.next)v.push(['next up',viewNext]);
  if(cal.today)v.push(['today',viewToday]);
  if(cal.tomorrow&&new Date().getHours()>=18)v.push(['tomorrow',viewTomorrow]);
  if(cal.count&&cdUpcoming().length)v.push(['countdowns',viewCount]);
  if(!v.length)v.push(['next up',viewNext]);
  return v;
}
function calRender(){
  if(mode!=='calendar')return;
  const views=calViews(); const [name,fn]=views[calViewIdx%views.length];
  const text=fn(); if(text!==calLastText){calLastText=text;send(text)}
  if(calErr)calSetStatus(calError(calErr)+(calEvents?' Showing the last events it loaded.':''));
  else if(calEvents)calSetStatus('Showing '+name+' · updated '+new Date(calFetchedAt).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}));
  else calSetStatus('Loading your calendar…');
}
function calStop(){clearInterval(calTick);clearInterval(calRotate);calTick=calRotate=null}
function startCalendar(){
  stopModes(); mode='calendar'; store.set('fb.mode','calendar'); $('calBtn').classList.add('on'); setStatus(busy?'Flipping':'Showing');
  calViewIdx=0; calLastText=''; calRender();
  calLoad(false).then(calRender);
  calRotate=setInterval(()=>{calViewIdx++;calRender()},cal.every*1000);
  calTick=setInterval(()=>{if(Date.now()-calFetchedAt>300000&&!calLoading)calLoad(false).then(calRender);else calRender()},30000);
}
$('calBtn').onclick=()=>{if(mode==='calendar')stopModes();else startCalendar()};
function renderCal(){
  $('calNext').checked=cal.next; $('calToday').checked=cal.today; $('calTomorrow').checked=cal.tomorrow; $('calCount').checked=cal.count;
  $('calAllDay').checked=cal.allDay; $('calEvery').value=String(cal.every);
  const ul=$('cdList'); ul.innerHTML='';
  if(!cal.countdowns.length){ul.innerHTML='<li class="hint">No countdowns yet. Add a trip, a birthday or anything you’re looking forward to.</li>'}
  cal.countdowns.slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))).forEach(c=>{
    const li=document.createElement('li');
    const t=document.createElement('span'); t.className='txt';
    const n=cdDays(c); t.textContent=UP(c.name)+' · '+(n<0?'passed':n===0?'today':n===1?'tomorrow':n+' days');
    const del=document.createElement('button'); del.type='button'; del.className='x'; del.textContent='Remove';
    del.onclick=()=>{cal.countdowns=cal.countdowns.filter(x=>x!==c);saveCal();renderCal();if(mode==='calendar')calRender()};
    li.append(t,del); ul.appendChild(li);
  });
}
[['calNext','next'],['calToday','today'],['calTomorrow','tomorrow'],['calCount','count'],['calAllDay','allDay']].forEach(([id,k])=>{$(id).onchange=()=>{cal[k]=$(id).checked;saveCal();if(mode==='calendar'){calLastText='';calRender()}}});
$('calEvery').onchange=()=>{cal.every=+$('calEvery').value;saveCal();if(mode==='calendar')startCalendar()};
$('cdAdd').onclick=()=>{
  const name=$('cdName').value.trim().slice(0,14), date=$('cdDate').value;
  if(!name){$('cdName').focus();return} if(!date){$('cdDate').focus();return}
  cal.countdowns.push({name,date}); saveCal(); $('cdName').value=''; $('cdDate').value=''; renderCal();
  if(mode==='calendar'){calLastText='';calRender()}
};
renderCal();

// News: BBC headlines. BBC feeds block browser requests, so a GitHub Action (.github/workflows/news.yml) copies them to news.json on the news-data branch every 20 minutes
const NEWS_URL='https://raw.githubusercontent.com/nancy-rink/Ciao-board/news-data/news.json';
const NEWS_HEAD={top:'BBC NEWS',world:'BBC WORLD',uk:'BBC UK',business:'BBC BUSINESS',technology:'BBC TECH',science:'BBC SCIENCE',sport:'BBC SPORT'};
const news=Object.assign({section:'top',every:30,count:10},store.get('fb.news',{}));
let newsData=null, newsAt=0, newsPages=[], newsIdx=0;
function saveNews(){store.set('fb.news',news)}
// Letters the board has no flap for: drop accents, straighten dashes, spell out the pound sign
function newsClean(t){return [...t.normalize('NFC')].map(ch=>IDX.has(ch.toUpperCase())?ch:ch.normalize('NFD').replace(/[\u0300-\u036f]/g,'')).join('').replace(/[\u2013\u2014]/g,'-').replace(/\u2026/g,'...').replace(/£/g,'GBP ').replace(/€/g,'EUR ')}
async function newsLoad(force){
  if(!force&&newsData&&Date.now()-newsAt<600000)return newsData;
  const r=await fetch(NEWS_URL,{cache:'no-cache'}); if(!r.ok)throw new Error('HTTP '+r.status);
  newsData=await r.json(); newsAt=Date.now(); return newsData;
}
// One page per headline; a headline too long for five rows runs over several pages
function newsBuild(){
  const sec=newsData&&(newsData.sections[news.section]||newsData.sections.top); newsPages=[];
  if(!sec)return;
  const head='{r} '+(NEWS_HEAD[news.section]||'BBC NEWS')+' {r}';
  sec.items.slice(0,news.count).forEach(h=>{
    const lines=layout(newsClean(h)).map(l=>l.join(''));
    const n=Math.ceil(lines.length/5);
    for(let i=0;i<lines.length;i+=5){
      const part=lines.slice(i,i+5);
      newsPages.push(head+(n>1?' '+(i/5+1)+'/'+n:'')+(part.length<=3&&n===1?'\n\n':'\n')+part.join('\n'));
    }
  });
}
function newsSetStatus(t){$('newsStatus').textContent=t}
function newsAgo(){
  const u=newsData&&Date.parse(newsData.updated); if(!u)return'';
  const m=Math.round((Date.now()-u)/60000);
  return m<2?'just now':m<90?m+' min ago':Math.round(m/60)+' hours ago';
}
async function newsNext(){
  try{
    const stale=!newsData||Date.now()-newsAt>=600000;
    await newsLoad();
    if(mode!=='news')return;
    if(stale||!newsPages.length){newsBuild();if(newsIdx>=newsPages.length)newsIdx=0}
    if(!newsPages.length)throw new Error('empty');
    send(newsPages[newsIdx%newsPages.length]); newsIdx=(newsIdx+1)%newsPages.length;
    newsSetStatus('Headlines from BBC News, updated '+newsAgo()+'.');
  }catch(e){
    if(mode!=='news')return;
    newsSetStatus('Couldn\'t load BBC headlines. Check the internet connection; the board will try again.');
    if(!newsPages.length)send('{r} BBC NEWS {r}\n\nCOULDN\'T LOAD\nHEADLINES');
  }
  try{updateSubs()}catch(e){}
}
function startNews(){
  stopModes(); mode='news'; store.set('fb.mode','news'); $('newsBtn').classList.add('on'); setStatus(busy?'Flipping':'Showing');
  newsIdx=0; newsPages=[]; newsNext();
  timer=setInterval(newsNext,news.every*1000);
}
$('newsBtn').onclick=()=>{if(mode==='news')stopModes();else startNews()};
$('newsSection').value=news.section; $('newsEvery').value=String(news.every); $('newsCount').value=String(news.count);
[['newsSection','section'],['newsEvery','every'],['newsCount','count']].forEach(([id,k])=>{$(id).onchange=()=>{news[k]=k==='section'?$(id).value:+$(id).value;saveNews();startNews()}});

