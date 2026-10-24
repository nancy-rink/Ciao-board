// Wall display, the Day plan, kiosk and full screen, and TV mode.
// Wall display: dim during the night hours, and in full screen drift the board a few pixels so no pixel stays lit the same way all day
const wall=Object.assign({dim:false,from:'22:00',to:'07:00',level:0.55,shift:true},store.get('fb.wall',{}));
function wallTick(){
  const d=new Date(), now=pad2(d.getHours())+':'+pad2(d.getMinutes());
  const night=wall.from<wall.to?(now>=wall.from&&now<wall.to):(now>=wall.from||now<wall.to);
  $('dimmer').style.opacity=wall.dim&&night?wall.level:0;
  const full=document.body.classList.contains('fs')||document.body.classList.contains('kiosk');
  if(wall.shift&&full){const t=Date.now()/60000;$('board').style.translate=Math.round(Math.sin(t/7)*5)+'px '+Math.round(Math.cos(t/11)*4)+'px'}
  else $('board').style.translate='';
}
function saveWall(){store.set('fb.wall',wall);wallTick()}
$('wallDim').checked=wall.dim; $('wallFrom').value=wall.from; $('wallTo').value=wall.to; $('wallLevel').value=String(wall.level); $('wallShift').checked=wall.shift;
$('wallDim').onchange=()=>{wall.dim=$('wallDim').checked;saveWall()};
$('wallFrom').onchange=()=>{if($('wallFrom').value){wall.from=$('wallFrom').value;saveWall()}};
$('wallTo').onchange=()=>{if($('wallTo').value){wall.to=$('wallTo').value;saveWall()}};
$('wallLevel').onchange=()=>{wall.level=+$('wallLevel').value;saveWall()};
$('wallShift').onchange=()=>{wall.shift=$('wallShift').checked;saveWall()};
setInterval(wallTick,30000); setTimeout(wallTick,0);

// Day plan: what the board shows, and its style, by time of day
const SHOW_OPTS=[['message','A message'],['clock','Clock'],['saved','Rotate saved messages'],['news','BBC headlines'],['word','Word of the day'],['book','Book: a chapter a day'],...ART.map(a=>['art:'+a.id,'Art: '+a.name])];
const sched=Object.assign({on:false,slots:[
  {t:'06:30',show:'message',text:'{y} DAWN PATROL {y}\nMALIBU 3-4 FT FAIR\nOFFSHORE TILL 10',style:'daylight'},
  {t:'08:00',show:'clock',text:'',style:'keep'},
  {t:'12:00',show:'saved',text:'',style:'harbor'},
  {t:'17:00',show:'message',text:'NEXT UP\n\nSOCCER PRACTICE\n5:30 PM',style:'classic'},
  {t:'21:30',show:'message',text:'{v} TOMORROW {v}\n\nHIGH TIDE 6:45 AM\nDENTIST 9:30 AM',style:'glow'}
]},store.get('fb.sched',{}));
const saveSched=()=>store.set('fb.sched',sched);
let schedTimer=null, schedKey='';
const sortSlots=()=>sched.slots.sort((a,b)=>a.t.localeCompare(b.t));
function currentSlotIdx(){
  if(!sched.slots.length)return -1;
  const d=new Date(), now=pad2(d.getHours())+':'+pad2(d.getMinutes());
  let idx=sched.slots.length-1;
  sched.slots.forEach((s,i)=>{if(s.t<=now)idx=i});
  return idx;
}
const fmtSlotTime=t=>{const [h,m]=t.split(':').map(Number);return clk.hours==='24'?t:(h%12||12)+':'+pad2(m)+(h<12?' AM':' PM')};
function schedApply(){
  const i=currentSlotIdx(); if(i<0){$('schedStatus').textContent='Add a time to start the plan.';return}
  const s=sched.slots[i]; const key=[i,s.t,s.show,s.text,s.style].join('|');
  const next=sched.slots[(i+1)%sched.slots.length];
  const label=(SHOW_OPTS.find(o=>o[0]===s.show)||['',s.show])[1];
  $('schedStatus').textContent='Running. '+label+' until '+fmtSlotTime(next.t)+'.';
  document.querySelectorAll('.slot').forEach(li=>li.classList.toggle('now',+li.dataset.i===i));
  if(key===schedKey)return; schedKey=key;
  schedDriving=true;
  try{
    if(s.style==='fav'){const f=store.get('fb.favStyles',[]).filter(id=>BOARD_STYLES.some(x=>x.id===id));if(f.length)applyStyle(f[(f.indexOf(styleId)+1)%f.length])}
    else if(s.style&&s.style!=='keep'&&BOARD_STYLES.some(x=>x.id===s.style))applyStyle(s.style);
    if(s.show==='message'){stopModes();send(s.text||'')}
    else if(s.show==='calendar')startCalendar();
    else if(s.show==='clock')startClock();
    else if(s.show==='weather')startWeather();
    else if(s.show==='surf')startSurf();
    else if(s.show==='news'){if(mode!=='news')startNews()}
    else if(s.show==='book'){if(mode!=='book')startBook()}
    else if(s.show==='word'){if(mode!=='word')startWord()}
    else if(s.show.startsWith('art:'))showArt(s.show.slice(4));
    else if(s.show==='saved'){if(mode!=='rotating'){mode='';$('rotateBtn').click()}}
  }finally{schedDriving=false}
  setStatus(busy?'Flipping':'Showing');
}
function startSchedule(){
  schedOn=true; sched.on=true; saveSched(); $('schedBtn').classList.add('on'); schedKey='';
  clearInterval(schedTimer); schedApply(); schedTimer=setInterval(schedApply,15000); renderSlots(); setStatus(busy?'Flipping':'Showing');
}
function schedOff(){
  if(!schedOn)return;
  schedOn=false; sched.on=false; saveSched(); clearInterval(schedTimer); schedTimer=null; $('schedBtn').classList.remove('on');
  $('schedStatus').textContent='Paused. Tap Run day plan to pick it back up.';
  document.querySelectorAll('.slot').forEach(li=>li.classList.remove('now'));
}
$('schedBtn').onclick=()=>{if(schedOn){schedOff();stopModes()}else startSchedule()};
function schedEdited(){saveSched();if(schedOn)schedApply()}
function renderSlots(){
  const ul=$('slots'); ul.innerHTML='';
  if(!sched.slots.length){ul.innerHTML='<li class="hint">No times yet. Tap Add a time.</li>';return}
  const cur=schedOn?currentSlotIdx():-1;
  sched.slots.forEach((s,i)=>{
    const li=document.createElement('li'); li.className='slot'+(i===cur?' now':''); li.dataset.i=i;
    const when=document.createElement('div'); when.className='when';
    const t=document.createElement('input'); t.type='time'; t.id='slot-t-'+i; t.value=s.t; t.setAttribute('aria-label','Start time');
    t.onchange=()=>{if(!t.value)return;s.t=t.value;sortSlots();renderSlots();schedEdited()};
    when.appendChild(t);
    if(i===cur){const b=document.createElement('span');b.className='badge';b.textContent='Now';when.appendChild(b)}
    const what=document.createElement('div'); what.className='what';
    const sel=document.createElement('select'); sel.id='slot-s-'+i; sel.setAttribute('aria-label','What to show');
    SHOW_OPTS.forEach(([v,l])=>{const o=document.createElement('option');o.value=v;o.textContent=l;sel.appendChild(o)}); sel.value=s.show;
    sel.onchange=()=>{s.show=sel.value;renderSlots();schedEdited()};
    const sty=document.createElement('select'); sty.id='slot-y-'+i; sty.setAttribute('aria-label','Board style');
    [['keep','Keep current style'],['fav','Next favorite style'],...BOARD_STYLES.map(x=>[x.id,x.name+' style'])].forEach(([v,l])=>{const o=document.createElement('option');o.value=v;o.textContent=l;sty.appendChild(o)}); sty.value=s.style||'keep';
    sty.onchange=()=>{s.style=sty.value;schedEdited()};
    what.append(sel,sty);
    if(s.show==='message'){
      const ta=document.createElement('textarea'); ta.id='slot-m-'+i; ta.rows=2; ta.spellcheck=false; ta.value=toEmoji(s.text||''); ta.setAttribute('aria-label','Message for this time');
      ta.oninput=()=>{liveTokens(ta);s.text=fromEmoji(ta.value);saveSched()}; ta.onchange=schedEdited;
      what.appendChild(ta);
    }
    const del=document.createElement('button'); del.type='button'; del.className='x'; del.textContent='Remove';
    del.onclick=()=>{const gone=sched.slots.splice(i,1)[0];renderSlots();schedEdited();toast('Time removed',()=>{sched.slots.push(gone);sortSlots();renderSlots();schedEdited()})};
    li.append(when,what,del); ul.appendChild(li);
  });
}
$('slotAdd').onclick=()=>{
  const last=sched.slots.length?sched.slots[sched.slots.length-1].t:'08:00';
  const h=Math.min(23,+last.split(':')[0]+1);
  sched.slots.push({t:pad2(h)+':00',show:'clock',text:'',style:'keep'}); sortSlots(); renderSlots(); schedEdited();
};
sortSlots();

function schedNextLabel(){
  const i=currentSlotIdx(); if(i<0)return '';
  const n=sched.slots[(i+1)%sched.slots.length];
  const SHORT={message:'Message',calendar:'Calendar',clock:'Clock',weather:'Weather',surf:'Surf',saved:'Saved messages',news:'News',book:'Book',word:'Word'};
  return (SHORT[n.show]||(SHOW_OPTS.find(o=>o[0]===n.show)||[0,n.show])[1])+' at '+fmtSlotTime(n.t).replace(':00','');
}
function updateSubs(){
  const set=(k,t)=>{const el=document.querySelector('[data-sub="'+k+'"]');if(el&&el.textContent!==t)el.textContent=t};
  set('saved',saved.length+' saved'+(mode==='rotating'?', rotating':''));
  set('clock',fmtTime(new Date()));
  set('weather',wx.cities.length?wx.cities[0].name.split(',')[0]+(wx.cities.length>1?' +'+(wx.cities.length-1):''):'Add a city');
  const m=surfData.malibu; set('surf',m&&m.quality?'Malibu, '+String(m.quality).toLowerCase()+(m.height?', '+m.height:''):'Malibu and Venice');
  let c='Google Calendar'; if(calEvents){const now=new Date(),ev=calEvents.find(e=>!e.allDay&&e.end>now);c=ev?'Next: '+ev.title:'Nothing coming up'} set('calendar',c);
  set('word',WORD_LANG[word.lang].name+' word of the day');
  set('book',bookInfo().title+', a chapter a day');
  set('news',newsData&&newsData.sections[news.section]?(newsData.sections[news.section].name==='Top stories'?'BBC top stories':'BBC '+newsData.sections[news.section].name.toLowerCase()):'BBC headlines');
  {const tv=rmTvs().find(l=>!l.pending),n=rmPhones().length;set('remote',tv?'Controlling '+tv.name:n?n+' phone'+(n>1?'s':'')+' paired':'Control your TV')}
  set('friends',frQueue().length?frQueue().length+' waiting':fr.links.some(l=>!l.pending&&!l.kind)?fr.links.filter(l=>!l.pending&&!l.kind).length+' connected':'Message a friend\'s board');
  set('schedule',schedOn?'On · next: '+schedNextLabel():'Off · changes the board through the day');
}
setInterval(()=>{try{updateSubs()}catch(e){}},20000);

// Kiosk + fullscreen + wake lock
let wake=null;
async function keepAwake(){try{if('wakeLock' in navigator)wake=await navigator.wakeLock.request('screen')}catch(e){}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&(document.body.classList.contains('kiosk')||document.body.classList.contains('fs')))keepAwake()});
$('showBtn').onclick=()=>{document.body.classList.remove('kiosk')};
const inNativeFs=()=>!!(document.fullscreenElement||document.webkitFullscreenElement);
let idleT=null, noteT=null;
function poke(){if(!document.body.classList.contains('fs'))return;document.body.classList.remove('idle');clearTimeout(idleT);idleT=setTimeout(()=>document.body.classList.add('idle'),4000)}
['pointermove','pointerdown','touchstart'].forEach(ev=>addEventListener(ev,poke,{passive:true}));
function fsNote(t){const n=$('fsNote');n.textContent=t;n.hidden=false;n.classList.remove('gone');clearTimeout(noteT);noteT=setTimeout(()=>n.classList.add('gone'),6000)}
function fitFill(){
  const b=$('board'); if(!document.body.classList.contains('fs')||!document.body.classList.contains('fill'))return;
  const cs=getComputedStyle(b);
  const W=b.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight);
  const H=b.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom);
  if(W<=0||H<=0)return;
  const g=Math.max(2,W*0.0045), rowH=(H-5*g)/6; let colW=(W-21*g)/22;
  // Keep flaps in real split-flap proportions: on a tall screen leave a band above and below rather than stretching them; on an ultrawide one narrow the grid
  let ar=colW/rowH; if(ar>.82){ar=.82;colW=rowH*ar} else if(ar<.62)ar=.62;
  const tileH=colW/ar;
  b.style.setProperty('--tile-ar',ar.toFixed(4)); b.style.setProperty('--fill-gap',g.toFixed(1)+'px');
  b.style.setProperty('--fill-w',(colW*22+g*21).toFixed(1)+'px');
  b.style.setProperty('--fill-font',Math.min(colW*0.95,tileH*0.6).toFixed(1)+'px');
}
let fsLayout=store.get('fb.fsLayout','fill');
// TV mode (?tv, or the …/tv address): the board alone, filling the window, with a start screen for the remote
const tvMode=new URLSearchParams(location.search).has('tv');
let keysOn=store.get('fb.keys',true);
$('keysOn').checked=keysOn; $('keysOn').onchange=()=>{keysOn=$('keysOn').checked;store.set('fb.keys',keysOn)};
function applyFsLayout(){document.body.classList.toggle('fill',fsLayout==='fill');$('fsLayout').value=fsLayout;requestAnimationFrame(fitFill)}
$('fsLayout').onchange=()=>{fsLayout=$('fsLayout').value;store.set('fb.fsLayout',fsLayout);applyFsLayout()};
applyFsLayout();
addEventListener('resize',()=>requestAnimationFrame(fitFill));
async function enterFs(){
  document.body.classList.add('fs'); keepAwake(); poke(); requestAnimationFrame(fitFill);
  const el=document.documentElement;
  try{
    if(el.requestFullscreen)await el.requestFullscreen({navigationUI:'hide'});
    else if(el.webkitRequestFullscreen)await el.webkitRequestFullscreen();
    else throw new Error('none');
    try{await screen.orientation.lock('landscape')}catch(e){}
  }catch(e){
    if(!tvMode)fsNote('This screen won’t let the board take over completely, so it fills the window instead. Turn your device sideways for the biggest board. Double-tap the board to come back.');
    return;
  }
  if(!tvMode&&matchMedia('(pointer:coarse)').matches)fsNote('Double-tap the board, or tap Exit full screen, to come back.');
}
function exitFs(){
  document.body.classList.remove('idle'); if(!tvMode)document.body.classList.remove('fs'); $('fsNote').hidden=true;
  if(inNativeFs()){try{(document.exitFullscreen||document.webkitExitFullscreen).call(document)}catch(e){}}
}
['fullscreenchange','webkitfullscreenchange'].forEach(ev=>document.addEventListener(ev,()=>{requestAnimationFrame(fitFill);if(!inNativeFs()&&!tvMode){document.body.classList.remove('fs','idle');$('fsNote').hidden=true}}));
$('fsBtn').onclick=enterFs; $('fsExit').onclick=exitFs;
if(tvMode){
  document.body.classList.add('tvmode','fs'); fsLayout='fill'; applyFsLayout(); keepAwake();
  $('tvStart').hidden=false; setTimeout(()=>$('tvGo').focus(),300); setTimeout(tvStartPair,400);
  $('tvGo').onclick=()=>{try{ensureAudio()}catch(e){}$('tvStart').hidden=true;$('tvGo').blur();enterFs()};
  // OK on the remote (Enter) with nothing selected shows or hides the controls
  document.addEventListener('keydown',e=>{
    if(e.key!=='Enter'||!$('tvStart').hidden||e.target!==document.body)return;
    e.preventDefault(); document.body.classList.toggle('fs'); requestAnimationFrame(fitFill);
    try{ensureAudio();setTimeout(checkAudio,200)}catch(err){} // a button press is what lets the TV's browser play sound
  });
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('fs'))exitFs()});
// Double-tap (or double-click) the board to go in or out. Phones don't reliably send dblclick, so taps are timed here.
let lastTap=0, lastTouch=0;
$('board').addEventListener('dblclick',()=>{if(Date.now()-lastTouch<800)return;document.body.classList.contains('fs')?exitFs():enterFs()});
$('board').addEventListener('pointerup',e=>{
  if(e.pointerType!=='touch'||tvMode)return; const now=Date.now(); lastTouch=now;
  if(now-lastTap<400){lastTap=0;document.body.classList.contains('fs')?exitFs():enterFs()}else lastTap=now;
});
document.addEventListener('keydown',e=>{if(!keysOn||e.target===msg||['SELECT','INPUT'].includes(e.target.tagName)||e.metaKey||e.ctrlKey||e.altKey)return;if(e.key==='h'||e.key==='H')document.body.classList.toggle('kiosk');else if(e.key==='s')stepStyle(1);else if(e.key==='S')stepStyle(-1)});

