// The mode cards and the sheet.
// Mode cards: tap to open a mode's settings; live modes also go up on the board right away
const PANES=['message','saved','clock','news','art','remote','friends','schedule','style'];
const CARDS=[...document.querySelectorAll('.card')];
let lastCard=store.get('fb.card','message');
function openTab(id){
  if(!PANES.includes(id))id='message';
  CARDS.forEach(b=>{const on=b.dataset.tab===id;b.setAttribute('aria-selected',String(on));b.tabIndex=on||(id==='style'&&b.dataset.tab===lastCard)?0:-1});
  const sb=$('tab-style'); sb.setAttribute('aria-expanded',String(id==='style')); sb.classList.toggle('on',id==='style');
  PANES.forEach(p=>{$('pane-'+p).hidden=p!==id});
  if(id!=='style'){lastCard=id;store.set('fb.card',id)}
  store.set('fb.tab',id);
}
const START={clock:()=>{if(mode!=='clock')startClock()},weather:()=>{if(mode!=='weather')startWeather()},surf:()=>{if(mode!=='surf')startSurf()},calendar:()=>{if(mode!=='calendar')startCalendar()},news:()=>{if(mode!=='news')startNews()},schedule:()=>{if(!schedOn)startSchedule()}};
CARDS.forEach((b,i)=>{
  b.onclick=()=>{openTab(b.dataset.tab);if(START[b.dataset.tab])START[b.dataset.tab]()};
  b.onkeydown=e=>{const d=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;if(!d)return;e.preventDefault();const n=CARDS[(i+d+CARDS.length)%CARDS.length];openTab(n.dataset.tab);n.focus()};
});
// The sheet: what to show, settings, or the style picker. Open buttons toggle it; the scrim, the close button and Escape close it.
const SHEET_TITLE={show:'What to show',settings:'Settings',style:'Board style'};
let sheetFrom=null;
function openSheet(view){
  const sh=$('sheet'); if(sh.hidden)sheetFrom=document.activeElement;
  if(view!=='style'&&!$('styleTray').hidden)closeTray(true);
  sh.dataset.view=view; sh.hidden=false; $('scrim').hidden=false; document.body.classList.add('sheet-open');
  $('sheetTitle').textContent=SHEET_TITLE[view];
  $('showOpen').setAttribute('aria-expanded',String(view==='show'));
  $('tab-style').setAttribute('aria-expanded',String(view==='settings')); $('tab-style').classList.toggle('on',view==='settings');
  if(innerWidth<900)scrollTo(0,0);
  requestAnimationFrame(fitSheet);
}
// On phones and tablets the board moves to the top and the sheet stops just below its bar, so changes stay in view;
// if that leaves too little room (a phone on its side), the sheet covers the board instead
function fitSheet(){
  const sh=$('sheet'); if(sh.hidden)return;
  if(innerWidth>=900){sh.style.maxHeight='';$('scrim').hidden=true;return}
  const avail=innerHeight-document.querySelector('.boardbar').getBoundingClientRect().bottom-10;
  const room=avail>=innerHeight*.5;
  sh.style.maxHeight=room?avail+'px':'';
  $('scrim').hidden=room; // a backdrop only when the sheet has to cover the board
}
addEventListener('resize',()=>requestAnimationFrame(fitSheet));
function closeSheet(){
  const sh=$('sheet'); if(sh.hidden)return;
  if(!$('styleTray').hidden)closeTray(true);
  sh.hidden=true; $('scrim').hidden=true; document.body.classList.remove('sheet-open');
  $('showOpen').setAttribute('aria-expanded','false'); $('tab-style').setAttribute('aria-expanded','false'); $('tab-style').classList.remove('on');
  if(sheetFrom&&sheetFrom.isConnected)sheetFrom.focus({preventScroll:true}); sheetFrom=null;
}
const sheetIs=v=>!$('sheet').hidden&&$('sheet').dataset.view===v;
$('sheetClose').onclick=closeSheet; $('scrim').onclick=closeSheet;
$('showOpen').onclick=()=>{if(sheetIs('show')){closeSheet();return}openTab(lastCard);openSheet('show')};
$('tab-style').onclick=()=>{if(sheetIs('settings')){closeSheet();return}openTab('style');openSheet('settings')};
// Tapping the status pill opens whatever is on the board
$('status').onclick=()=>{openTab(schedOn?'schedule':MODE_TAB[mode]||lastCard);openSheet('show')};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('sheet').hidden&&$('styleTray').hidden&&!document.body.classList.contains('fs'))closeSheet()});
function openSec(sec){
  document.querySelectorAll('.setsec').forEach(d=>d.hidden=d.dataset.sec!==sec);
  document.querySelectorAll('#setNav button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sec===sec)));
  store.set('fb.setsec',sec);
}
document.querySelectorAll('#setNav button').forEach(b=>b.onclick=()=>openSec(b.dataset.sec));
openSec(store.get('fb.setsec','look'));
openTab(lastCard);

