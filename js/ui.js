// The app's frame: the board with a status line, and four tabs (Show, Look, Connect, Settings). On a phone the tabs sit
// along the bottom and the board stays in view above whatever is open; on a wide screen they're a panel beside the board.
// Nothing changes on the board while you look around: a channel or a style is previewed first, then put on the board.
const VIEWS=['show','look','connect','settings'];
let view=store.get('fb.view','show'); if(!VIEWS.includes(view))view='show';
function showView(v){
  if(!VIEWS.includes(v))v='show';
  if(v!==view){if(view==='show'){endPreview(false);closeDetail()}if(view==='look')cancelTry()}
  view=v; store.set('fb.view',v);
  VIEWS.forEach(x=>{$('view-'+x).hidden=x!==v;const t=$('tab-'+x);t.setAttribute('aria-selected',String(x===v));t.tabIndex=x===v?0:-1});
  if(innerWidth<900)scrollTo({top:0});else $('panel').scrollTop=0;
}
const TABS=VIEWS.map(v=>$('tab-'+v));
TABS.forEach((t,i)=>{
  t.onclick=()=>showView(t.dataset.view);
  t.onkeydown=e=>{const d=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;if(!d)return;e.preventDefault();const n=TABS[(i+d+TABS.length)%TABS.length];showView(n.dataset.view);n.focus()};
});
// Tapping the status line goes back to what's on the board
$('status').onclick=()=>showView('show');
$('status').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();showView('show')}};
// On a phone the board stays pinned at the top; scrolled-to sections keep clear of it
function stageHeight(){document.documentElement.style.setProperty('--stage-h',(innerWidth<900?$('stage').offsetHeight:0)+'px')}
new ResizeObserver(stageHeight).observe($('stage')); addEventListener('resize',stageHeight);

// The bar under the board, for whatever is being previewed: a channel or a style
function setTry(t){
  const b=$('tryBar'); $('board').classList.toggle('previewing',!!t); if(!t){b.hidden=true;return}
  $('tryName').textContent=t.name; $('tryNote').textContent=t.note||'';
  $('tryCancel').textContent=t.keepLabel; $('tryUse').textContent=t.useLabel;
  $('tryCancel').onclick=t.keep; $('tryUse').onclick=t.use; b.hidden=false;
}

// Channels: what the board can show. Each card has a live miniature of what it would show.
const CHANNELS=[
  {id:'message',name:'Message',sub:'Write your own',c:'y',text:()=>getMsg(),on:()=>mode===''&&!/^(Picture|Preview): /.test(boardLabel||''),put:()=>manualSend()},
  {id:'saved',name:'Saved',sub:'Your saved messages',c:'o',text:()=>saved[0]||'NO SAVED\nMESSAGES YET',on:()=>mode==='rotating',put:()=>{if(saved.length){mode='';$('rotateBtn').click()}},ready:()=>saved.length>0},
  {id:'clock',name:'Clock',sub:'Time and date',c:'w',text:()=>clockText(),on:()=>mode==='clock',put:()=>startClock()},
  {id:'news',name:'News',sub:'BBC headlines',c:'r',text:()=>newsPreview(),on:()=>mode==='news',put:()=>startNews()},
  {id:'word',name:'Word',sub:'Word of the day',c:'g',text:()=>wordText(),on:()=>mode==='word',put:()=>startWord()},
  {id:'book',name:'Book',sub:'A chapter a day',c:'v',cells:()=>bookCells(),on:()=>mode==='book',put:()=>startBook()},
  {id:'art',name:'Art',sub:'Color-tile pictures',c:'b',cells:()=>{const a=ART_BY[artCur]||ART[0];return artCells(a.frame?a.frame(0):a.rows)},on:()=>mode==='art'||(mode===''&&/^Picture: /.test(boardLabel||'')),put:()=>{const a=ART_BY[artCur]||ART[0];a.frame?startArt(a.id):showArt(a.id)}}
];
const CH=Object.fromEntries(CHANNELS.map(c=>[c.id,c]));
const chCells=c=>c.cells?c.cells():toTargets(c.text()).cells;
// The first page of headlines, without disturbing a news run that's under way
function newsPreview(){
  if(!newsData){newsLoad().then(()=>{renderChannels();if(pv&&pv.id==='news')previewChannel('news',true)}).catch(()=>{});return '{r} BBC NEWS {r}\n\nLOADING HEADLINES'}
  const keep=newsPages; newsBuild(); const p=newsPages[0]; newsPages=keep;
  return p||'{r} BBC NEWS {r}\n\nNO HEADLINES';
}
function buildChannels(){
  CHANNELS.forEach(c=>{
    const card=document.createElement('div'); card.className='chan'; card.dataset.id=c.id;
    const b=document.createElement('button'); b.type='button'; b.className='chan-main';
    const mini=document.createElement('span'); mini.className='chan-mini'; mini.setAttribute('aria-hidden','true');
    for(let i=0;i<COLS*ROWS;i++)mini.appendChild(document.createElement('i'));
    const nm=document.createElement('span'); nm.className='chan-name';
    nm.innerHTML='<b></b><span class="onb">On board</span>'; nm.firstChild.textContent=c.name;
    const sub=document.createElement('span'); sub.className='chan-sub'; sub.dataset.sub=c.id; sub.textContent=c.sub;
    b.append(mini,nm,sub); b.onclick=()=>previewChannel(c.id);
    const o=document.createElement('button'); o.type='button'; o.className='chan-opts'; o.textContent='Options'; o.setAttribute('aria-label',c.name+' options');
    o.onclick=()=>openDetail(c.id);
    card.append(b,o); $('channels').appendChild(card); c.el=card;
  });
}
function renderChannels(){
  CHANNELS.forEach(c=>{
    if(!c.el)return;
    const on=!pv&&c.on(), cells=chCells(c), mini=c.el.querySelector('.chan-mini');
    mini.dataset.style=styleId;
    [...mini.children].forEach((sq,i)=>{const ch=CHARS[cells[i]]||' ';if(ch.length===3){sq.textContent='';sq.style.background='var('+COLORS[ch[1]]+')'}else{sq.textContent=ch.trim();sq.style.background=''}});
    c.el.classList.toggle('on',on); c.el.classList.toggle('trying',!!pv&&pv.id===c.id);
    c.el.querySelector('.chan-main').setAttribute('aria-label',c.name+(on?', on the board':'')+'. Preview on the board');
  });
  renderPlanCard();
}
// Preview: the channel flips onto the board while whatever is running waits (its updates are held, not lost)
let pv=null;
function currentName(){const c=CHANNELS.find(x=>x.on());return schedOn?'the day plan':c?c.name.toLowerCase():'the board'}
function previewChannel(id,again){
  const c=CH[id];
  if(!pv&&c.on()){toast(c.name+' is already on the board');return}
  if(pv&&pv.id===id&&!again){endPreview(true);return} // a second tap on the same card puts it on
  cancelTry();
  if(!pv)pv={before:[lastSent,lastOpts],keep:'Keep '+currentName()};
  pv.id=id; previewHold=true;
  const cells=c.cells?c.cells():null;
  send(cells?'':c.text(),Object.assign({preview:true,label:'Preview: '+c.name},cells?{cells}:{}));
  setTry({name:'Previewing '+c.name,note:c.ready&&!c.ready()?'Save a message first, in Options.':'',keepLabel:pv.keep,useLabel:'Put on board',keep:()=>endPreview(false),use:()=>endPreview(true)});
  renderChannels(); setStatus(busy?'Flipping':'Showing');
}
function endPreview(commit){
  if(!pv)return; const p=pv; pv=null; previewHold=false; setTry(null);
  const c=CH[p.id], held=heldSend; heldSend=null;
  if(commit&&(!c.ready||c.ready())){c.put();toast(c.name+' is on the board')}
  else{const back=held||p.before;if(back[0]!=null)send(back[0],back[1]||{});else send('')}
  renderChannels(); setStatus(busy?'Flipping':'Showing');
}
// Options: a channel's settings, in its existing panel; changing them doesn't put the channel on the board
const DETAIL=['message','saved','clock','weather','surf','calendar','news','word','book','art','schedule'];
function openDetail(id){
  if(view!=='show')showView('show');
  endPreview(false);
  $('showHome').hidden=true; $('showDetail').hidden=false;
  DETAIL.forEach(p=>{$('pane-'+p).hidden=p!==id});
  store.set('fb.detail',id);
  if(innerWidth<900)scrollTo({top:0});else $('panel').scrollTop=0;
  $('detailBack').focus({preventScroll:true});
}
function closeDetail(){if($('showDetail').hidden)return;$('showDetail').hidden=true;$('showHome').hidden=false;store.set('fb.detail','')}
$('detailBack').onclick=()=>{closeDetail();renderChannels()};
// Day plan: on/off, and the day at a glance
$('planSwitch').onclick=()=>$('schedBtn').click();
$('planEdit').onclick=()=>openDetail('schedule');
function renderPlanCard(){
  const sw=$('planSwitch'); sw.setAttribute('aria-checked',String(schedOn)); sw.classList.toggle('on',schedOn);
  const slots=sched.slots.slice(0,6), key=slots.map(s=>s.t+s.show).join('|'), box=$('planSlots');
  if(box.dataset.k===key)return; box.dataset.k=key; box.innerHTML='';
  slots.forEach(s=>{
    const chip=document.createElement('span'); chip.className='slotchip';
    const t=document.createElement('span'); t.textContent=fmtSlotTime(s.t);
    const w=document.createElement('b'); w.textContent=(SHOW_OPTS.find(o=>o[0]===s.show)||['',s.show])[1];
    chip.append(t,w); box.appendChild(chip);
  });
}
// Settings sections
function openSec(sec){
  if(!['motion','wall','sound'].includes(sec))sec='motion';
  document.querySelectorAll('.setsec').forEach(d=>d.hidden=d.dataset.sec!==sec);
  document.querySelectorAll('#setNav button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sec===sec)));
  store.set('fb.setsec',sec);
}
document.querySelectorAll('#setNav button').forEach(b=>b.onclick=()=>openSec(b.dataset.sec));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&pv&&!document.body.classList.contains('fs'))endPreview(false)});
openSec(store.get('fb.setsec','motion'));
buildChannels();
showView(view);
setInterval(()=>{if(view==='show'&&!document.hidden)renderChannels()},20000);
