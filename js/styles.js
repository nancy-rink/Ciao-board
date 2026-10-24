// Board styles and the style picker.
// Board styles
const BOARD_STYLES=[
  {id:'classic',group:'everyday',name:'Classic',note:'Black flaps, cream letters.'},
  {id:'daylight',group:'everyday',name:'Daylight',note:'White flaps for a bright room.'},
  {id:'mint',group:'everyday',name:'Mint',note:'Soft mint flaps, deep teal letters, for a bright room.'},
  {id:'rail',group:'everyday',name:'Rail',note:'Green flaps, white letters.'},
  {id:'harbor',group:'everyday',name:'Harbor',note:'Navy flaps, sand letters.'},
  {id:'glow',group:'everyday',name:'Glow',note:'Glowing amber pixels.'},
  {id:'solari',group:'machines',name:'Solari',note:'Station board: matte black, hinge pins, crisp white letters.'},
  {id:'pragotron',group:'machines',name:'Euro rail',note:'Gray-black flaps with a red route stripe.'},
  {id:'patapata',group:'machines',name:'Patapata',note:'Platform board from Japanese stations: rows set flush left, black flaps.'},
  {id:'cifra',group:'machines',name:'Cifra clock',note:'Rounded off-white flaps in a brown bakelite frame.'},
  {id:'caslon',group:'machines',name:'Caslon 101',note:'Copal’s 1970s flip clock: serif letters, beige case, orange lamp.'},
  {id:'ticket',group:'machines',name:'Card ticket',note:'Edmondson card tickets, used by railways from Britain to India and Taiwan: green pasteboard in a wooden rack.'},
  {id:'ikarus',group:'machines',name:'Ikarus',note:'Budapest’s blue Ikarus buses, 1970s and 80s: a black roll-sign with white letters, set in the blue body.'},
  {id:'sbb',group:'machines',name:'SBB clock',note:'Hans Hilfiker’s Swiss railway clock, 1944: a white face, black letters and the red disc of the second hand.'},
  {id:'weltzeituhr',group:'machines',name:'Weltzeituhr',note:'East Berlin’s 1969 World Time Clock at Alexanderplatz: brushed aluminium and a ring of time-zone colors.'},
  {id:'metropolitana',group:'wayfinding',name:'Metropolitana',note:'Milan Metro by Albini and Noorda, 1964: matte black, ivory letters, a red band on top.'},
  {id:'standard',group:'wayfinding',name:'Standard',note:'New York subway standards: white flaps, black letters, line colors.'},
  {id:'doublearrow',group:'wayfinding',name:'Double Arrow',note:'British Rail: light flaps above, dark below, a red strip.'},
  {id:'oxblood',group:'wayfinding',name:'Oxblood',note:'Leslie Green’s 1906 tube stations: an oxblood glazed frame, cream tiles, green letters.'},
  {id:'foldalatti',group:'wayfinding',name:'Földalatti',note:'Budapest’s 1896 Millennium Underground, the first on the continent: white glazed tiles, oxblood letters, a dark timber frame.'},
  {id:'neon',group:'wayfinding',name:'Warsaw Neon',note:'The hand-bent neon signs of 1960s Warsaw: glowing pink tubes on a dark brick wall.'},
  {id:'ekimei',group:'wayfinding',name:'Ekimei',note:'Station name signs: rounded gothic letters, white flaps.'},
  {id:'taipei',group:'wayfinding',name:'Taipei Metro',note:'Taipei Metro signs, 1996: graphite flaps, white letters, the line colors along the foot.'},
  {id:'metro',group:'wayfinding',name:'Metro',note:'Mexico City Metro, 1969: line-pink flaps, white letters, soft corners.'},
  {id:'ulm',group:'identity',name:'Ulm',note:'Otl Aicher’s airline grid: signal yellow on navy, square corners.'},
  {id:'olympia',group:'identity',name:'Olympia 72',note:'Munich 1972: white flaps, blue letters, a silver frame.'},
  {id:'mexico68',group:'identity',name:'Mexico 68',note:'1968 Olympics: op-art striped frame, white flaps, festive colors.'},
  {id:'jetage',group:'identity',name:'Jet Age',note:'1962 jet terminal: oyster flaps, red letters, a swooping frame.'},
  {id:'dangan',group:'identity',name:'Dangan',note:'The 1964 bullet train: ivory flaps, blue letters, a rounded nose.'},
  {id:'butterfly',group:'material',name:'Butterfly',note:'Sori Yanagi’s stool: plywood flaps, rosewood frame, brass.'},
  {id:'moquette',group:'material',name:'Moquette',note:'Enid Marx’s 1930s seat fabric for London Transport: a woven frame, dark flaps, straw letters.'},
  {id:'grille',group:'material',name:'Window Grille',note:'Iron window grilles from 1970s Taiwanese homes: a painted lattice on terrazzo, cream flaps.'},
  {id:'chandigarh',group:'material',name:'Chandigarh',note:'Le Corbusier and Pierre Jeanneret’s city: board-marked concrete, stencil letters, enamel color blocks.'},
  {id:'marinedrive',group:'material',name:'Marine Drive',note:'Bombay’s 1930s seafront Art Deco: cream plaster, teal letters, a sunburst frame.'},
  {id:'filete',group:'material',name:'Filete',note:'Buenos Aires filete porteño: gold serif letters, red, gold and green borders.'},
  {id:'calcadao',group:'material',name:'Calçadão',note:'Copacabana promenade: a black-and-white wave frame, sand-white flaps.'},
  {id:'zsolnay',group:'material',name:'Zsolnay',note:'Zsolnay ceramics from Pécs, on Ödön Lechner’s roofs: green and gold tiles with an iridescent eosin sheen.'},
  {id:'praguemetro',group:'material',name:'Prague Metro',note:'Prague Metro’s Line A, 1978: dimpled anodized-aluminium walls in gold, dark flaps, the line colors.'},
  {id:'cubist',group:'material',name:'Cubist',note:'Prague Cubism of the 1910s, like Gočár’s House of the Black Madonna: a faceted ochre frame, tall narrow letters.'},
  {id:'matyo',group:'material',name:'Matyó',note:'Matyó embroidery from Mezőkövesd, Hungary: black cloth, a border of red, pink and blue roses.'},
  {id:'bojagi',group:'material',name:'Bojagi',note:'Korean patchwork wrapping cloth: soft ramie patches, stitched seams, plum letters.'},
  {id:'hakka',group:'material',name:'Hakka Floral',note:'Taiwan’s Hakka flower cloth: big peonies on red, cream letters on red flaps.'},
  {id:'barragan',group:'material',name:'Barragán',note:'Luis Barragán’s Mexico City walls: Mexican-pink flaps among planes of ochre, lilac and terracotta.'},
  {id:'cinetica',group:'studio',name:'Cinética',note:'Venezuelan kinetic art: fine red, green and blue rods around a black board.'},
  {id:'tonfan',group:'studio',name:'Ton Fan',note:'After Ho Kan and Taipei’s Ton Fan painters, 1957: black flaps on cream, a red sun, a blue bar.'},
  {id:'graphite',group:'studio',name:'Graphite',note:'After Nasreen Mohamedi’s ink and graphite grids: paper-white flaps, hairline letters, one long diagonal.'},
  {id:'kassak',group:'studio',name:'Kassák',note:'After Lajos Kassák and his magazine MA: red and black blocks on paper, heavy letters.'},
  {id:'werkstatte',group:'studio',name:'Wiener Werkstätte',note:'Josef Hoffmann and Koloman Moser’s Vienna workshops, 1903: a black-and-white checker frame and a gold line.'},
  {id:'plakat',group:'studio',name:'Plakat',note:'The Polish Poster School of Tomaszewski and Lenica: hand-drawn letters and painted color on paper.'},
  {id:'william',group:'museum',name:'William',note:'The Met’s faience hippo: glazed turquoise flaps, black-painted letters.'},
  {id:'iznik',group:'museum',name:'Iznik',note:'Ottoman tiles from Iznik: white flaps, cobalt letters, a border of rosettes.'},
  {id:'tiffany',group:'museum',name:'Tiffany',note:'Tiffany Studios’ Autumn Landscape window: opalescent flaps and a sunset of leaded glass.'},
  {id:'buttoncopy',group:'cities',city:'Los Angeles',name:'Button Copy',note:'Caltrans freeway signs: highway green, white letters set with reflector buttons, a white border and bolts.'},
  {id:'googie',group:'cities',city:'Los Angeles',name:'Googie',note:'Coffee-shop modern and the LAX Theme Building: turquoise, starbursts and boomerangs, rounded cream flaps.'},
  {id:'stahl',group:'cities',city:'Los Angeles',name:'Stahl House',note:'Pierre Koenig’s glass house above the city: night flaps, a thin steel edge, city lights below.'},
  {id:'splash',group:'cities',city:'Los Angeles',name:'A Bigger Splash',note:'After Hockney’s 1967 painting: pool-blue flaps, a pink wall, and a white splash.'},
  {id:'guayasamin',group:'cities',city:'Quito',name:'Guayasamín',note:'After Oswaldo Guayasamín: ochre flaps, heavy black letters, angular strokes of red and brown.'},
];
let styleId=store.get('fb.style','classic');
// Worn used to be a style; it's now a finish that ages any style. A board that was Worn becomes Classic, worn.
let aged=!!store.get('fb.aged',false); if(styleId==='worn'){styleId='classic';aged=true;store.set('fb.style',styleId);store.set('fb.aged',true)}
if(!BOARD_STYLES.some(s=>s.id===styleId))styleId='classic';
let favStyles=store.get('fb.favStyles',[]).filter(id=>BOARD_STYLES.some(s=>s.id===id));
// Day plan times that used a retired style keep the current style instead
const schedStyleOk=v=>!v||v==='keep'||v==='fav'||BOARD_STYLES.some(x=>x.id===v);
if(sched.slots.some(s=>!schedStyleOk(s.style))){sched.slots.forEach(s=>{if(!schedStyleOk(s.style))s.style='keep'});saveSched();renderSlots()}
// A style dresses the board (and the channel previews) only; the controls keep the standard look.
// In full screen nothing but the board shows, so the whole screen takes the style's frame color.
function styleScope(){
  $('board').dataset.style=styleId; $('pv').dataset.style=styleId; document.querySelectorAll('.art-pv').forEach(e=>e.dataset.style=styleId);
  if(document.body.classList.contains('fs'))document.body.dataset.style=styleId; else delete document.body.dataset.style;
  [$('board'),$('pv')].forEach(e=>{if(aged)e.dataset.aged='';else delete e.dataset.aged});
}
new MutationObserver(()=>{styleScope();scheduleAtlas()}).observe(document.body,{attributes:true,attributeFilter:['class']});
function applyStyle(id){
  const wasLeft=alignLeft(), shown=$('board').dataset.style;
  styleId=id; store.set('fb.style',id); styleScope(); scheduleAtlas();
  if(shown!==id)restyleCascade(shown);
  if(alignLeft()!==wasLeft){if(lastSent!=null)send(lastSent);try{updateCount()}catch(e){}}
  const s=BOARD_STYLES.find(x=>x.id===id); $('styleName').textContent=s.name;
  markSwatches(); trayBar(); try{renderChannels()}catch(e){}
}
// S (and the automatic style change) steps through your favorites when you have two or more, otherwise through every style
function stepStyle(d){
  const list=favStyles.length>1?favStyles:BOARD_STYLES.map(s=>s.id), i=list.indexOf(styleId);
  applyStyle(list[((i<0?(d>0?-1:0):i)+d+list.length)%list.length]);
}
const SW_CELLS=[' ','C','I','A','O',' ','{r}','7',':','4','5','{b}'];
function miniTile(c){
  const t=document.createElement('div'); t.className='t';
  t.style.cssText='--jx:'+((Math.random()-.5)*.5).toFixed(2)+';--jy:'+((Math.random()-.5)*.3).toFixed(2)+';--fd:'+(Math.random()*.35).toFixed(2)+';--sx:'+(Math.random()*100|0)+'%;--sy:'+(Math.random()*100|0)+'%';
  const color=c.length===3?'var(--c-'+c[1]+')':'';
  t.innerHTML='<div class="h u"><span></span></div><div class="h d"><span></span></div>';
  t.querySelectorAll('.h').forEach(h=>{if(color)h.style.background=color;else h.firstChild.textContent=c.trim()});
  return t;
}
// A miniature board in a style: the same tiles and tokens as the real one, scaled down
function miniBoard(id){
  const mb=document.createElement('span'); mb.className='minib'; mb.dataset.style=id; mb.setAttribute('aria-hidden','true');
  const g=document.createElement('span'); g.className='g6'; SW_CELLS.forEach((c,i)=>{const t=miniTile(c);if(id==='pragotron'&&i===0)t.classList.add('edge');if(i>=6)t.classList.add('lo');g.appendChild(t)}); mb.appendChild(g);
  return mb;
}
// The six Everyday colorways share one card, with a dot for each
const EVERYDAY=BOARD_STYLES.filter(s=>s.group==='everyday').map(s=>s.id);
const STAR='<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M10 2.6l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L2.8 7.9l5-.7z" fill="var(--star-fill,none)" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';
let trying=null;
// Hovering previews a style only with a real mouse that actually moved there, not when the page shifts under a still pointer
const canHover=matchMedia('(hover:hover) and (pointer:fine)');
const hoverPreview=e=>!trying&&!pv&&canHover.matches&&(e.movementX!==0||e.movementY!==0);
function styleCard(id,family){
  const s=BOARD_STYLES.find(x=>x.id===id);
  const c=document.createElement('div'); c.className='swatch'+(family?' family':''); c.dataset.id=id; if(family)c.dataset.family='everyday';
  const main=document.createElement('button'); main.type='button'; main.className='sw-main';
  const nm=document.createElement('span'); nm.className='nm2'; nm.innerHTML='<span></span><i class="tick"><svg viewBox="0 0 12 12" width="10" height="10"><path d="M2.5 6.2 5 8.5 9.5 3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></i>';
  nm.firstChild.textContent=family?'Everyday':s.name;
  main.append(miniBoard(id),nm);
  main.onclick=()=>tryStyle(c.dataset.id);
  main.onmouseenter=e=>{if(hoverPreview(e))previewStyle(c.dataset.id)};
  const fav=document.createElement('button'); fav.type='button'; fav.className='sw-fav'; fav.innerHTML=STAR;
  fav.onclick=()=>toggleFav(c.dataset.id);
  // About: what the style is drawn from, with the source on the card
  const ab=document.createElement('button'); ab.type='button'; ab.className='sw-about';
  ab.innerHTML='<i aria-hidden="true">i</i><span></span>'; ab.onclick=()=>openAbout(c.dataset.id);
  aboutTag(ab,id);
  c.append(main,fav);
  if(family){
    const dots=document.createElement('div'); dots.className='sw-dots'; dots.setAttribute('role','group'); dots.setAttribute('aria-label','Everyday colors');
    EVERYDAY.forEach(eid=>{const e=BOARD_STYLES.find(x=>x.id===eid),d=document.createElement('button');d.type='button';d.dataset.id=eid;d.dataset.style=eid;d.title=e.name;d.setAttribute('aria-label',e.name);
      d.onclick=()=>{setFamily(c,eid);tryStyle(eid)};d.onmouseenter=e=>{if(hoverPreview(e))previewStyle(eid)};dots.appendChild(d)});
    c.appendChild(dots);
  }
  c.appendChild(ab);
  return c;
}
function setFamily(card,id){
  card.dataset.id=id; const mb=card.querySelector('.minib'); mb.replaceWith(miniBoard(id));
  card.querySelector('.nm2 span').textContent='Everyday · '+BOARD_STYLES.find(x=>x.id===id).name;
  aboutTag(card.querySelector('.sw-about'),id);
}
function aboutTag(ab,id){
  ab.lastChild.textContent=(STYLE_ART[id]||{}).tag||'About';
  ab.setAttribute('aria-label','About '+BOARD_STYLES.find(x=>x.id===id).name);
}
function buildStyles(){
  document.querySelectorAll('#styleTray .swatches').forEach(b=>b.innerHTML='');
  BOARD_STYLES.forEach(s=>{
    if(s.group==='everyday'){if(s.id===EVERYDAY[0]){const c=styleCard(EVERYDAY.includes(styleId)?styleId:s.id,true);$('sw-everyday').appendChild(c);setFamily(c,c.dataset.id)}return}
    const box=$('sw-'+s.group)||$('sw-everyday');
    // In Cities, a small heading where each city starts
    if(s.city&&box.lastElementChild?.dataset.city!==s.city){const h=document.createElement('div');h.className='sw-city';h.dataset.city=s.city;h.textContent=s.city;box.appendChild(h)}
    const card=styleCard(s.id); if(s.city)card.dataset.city=s.city; box.appendChild(card);
  });
  favStyles.forEach(id=>$('sw-fav').appendChild(styleCard(id)));
  $('grp-fav').hidden=!favStyles.length; $('chip-fav').hidden=!favStyles.length;
  // Light or dark, from each style's own flap color
  document.querySelectorAll('#styleTray .swatch').forEach(c=>{c.dataset.tone=styleTone(c.dataset.id)});
  document.querySelectorAll('#styleTray .tray-group').forEach(g=>{const n=g.querySelector('.grp-n');if(n){const k=BOARD_STYLES.filter(s=>'grp-'+s.group===g.id).length;n.textContent=k+(g.id==='grp-everyday'?' colors':' styles')}});
  filterStyles(); markSwatches();
}
// Groups start closed, except the one with the board's style; Favorites is always open
const groupOf=id=>(BOARD_STYLES.find(s=>s.id===id)||{}).group;
function setGroupOpen(g,on){
  const el=$('grp-'+g); if(!el)return; el.classList.toggle('open',on);
  const b=el.querySelector('.grp-toggle'); if(b)b.setAttribute('aria-expanded',String(on));
}
document.querySelectorAll('#styleTray .grp-toggle').forEach(b=>b.onclick=()=>{const g=b.closest('.tray-group');setGroupOpen(g.id.slice(4),!g.classList.contains('open'))});
setGroupOpen('fav',true); setGroupOpen(groupOf(styleId),true);
const toneCache={};
function styleTone(id){
  if(toneCache[id])return toneCache[id];
  const probe=document.createElement('span'); probe.dataset.style=id; probe.hidden=true; document.body.appendChild(probe);
  const hex=getComputedStyle(probe).getPropertyValue('--tile').trim(); probe.remove();
  const m=hex.match(/^#([0-9a-f]{6})$/i); let tone='dark';
  if(m){const n=parseInt(m[1],16),l=.2126*(n>>16)+.7152*(n>>8&255)+.0722*(n&255);tone=l>140?'light':'dark'}
  return toneCache[id]=tone;
}
function markSwatches(){
  document.querySelectorAll('#styleTray .swatch').forEach(c=>{
    const on=c.dataset.family?EVERYDAY.includes(styleId):c.dataset.id===styleId;
    if(c.dataset.family&&on&&c.dataset.id!==styleId)setFamily(c,styleId);
    c.classList.toggle('on',on); c.querySelector('.sw-main').setAttribute('aria-pressed',String(on));
    c.classList.toggle('trying',!!trying&&(c.dataset.family?EVERYDAY.includes(trying):c.dataset.id===trying));
    const fav=favStyles.includes(c.dataset.id), f=c.querySelector('.sw-fav'), nm=BOARD_STYLES.find(x=>x.id===c.dataset.id).name;
    f.classList.toggle('on',fav); f.setAttribute('aria-pressed',String(fav)); f.setAttribute('aria-label',(fav?'Remove ':'Add ')+nm+(fav?' from':' to')+' favorites');
    c.querySelectorAll('.sw-dots button').forEach(d=>d.setAttribute('aria-pressed',String(d.dataset.id===(trying&&EVERYDAY.includes(trying)?trying:styleId))));
  });
}
// While a style is being tried, the bar under the board says so, with Use and Keep
function trayBar(){
  if(!trying){if(!pv)setTry(null);return}
  const s=BOARD_STYLES.find(x=>x.id===trying), cur=BOARD_STYLES.find(x=>x.id===styleId);
  setTry({name:'Trying '+s.name,note:s.note,keepLabel:'Keep '+cur.name,useLabel:'Use this style',keep:cancelTry,use:useTried});
}
function tryStyle(id){
  if(pv)endPreview(false);
  if(id===styleId&&!trying)return;
  if(trying===id){useTried();return} // a second tap on the same card picks it
  trying=id===styleId?null:id; previewStyle(trying); markSwatches(); trayBar();
}
function useTried(){const id=trying;trying=null;if(id)applyStyle(id);previewStyle(null);markSwatches();trayBar()}
function cancelTry(){if(!trying)return;trying=null;previewStyle(null);markSwatches();trayBar()}
function toggleFav(id){
  favStyles=favStyles.includes(id)?favStyles.filter(x=>x!==id):[...favStyles,id]; store.set('fb.favStyles',favStyles);
  $('sw-fav').innerHTML=''; favStyles.forEach(f=>$('sw-fav').appendChild(styleCard(f)));
  $('sw-fav').querySelectorAll('.swatch').forEach(c=>{c.dataset.tone=styleTone(c.dataset.id)});
  $('grp-fav').hidden=!favStyles.length; $('chip-fav').hidden=!favStyles.length;
  filterStyles(); markSwatches(); renderSlots();
}
let toneFilter='all';
function filterStyles(){
  document.querySelectorAll('#styleTray .swatch').forEach(c=>{c.hidden=toneFilter!=='all'&&!(c.dataset.family?EVERYDAY.some(e=>styleTone(e)===toneFilter):c.dataset.tone===toneFilter)});
  document.querySelectorAll('#styleTray .sw-city').forEach(h=>{h.hidden=![...h.parentNode.querySelectorAll('.swatch[data-city="'+h.dataset.city+'"]')].some(c=>!c.hidden)});
  document.querySelectorAll('#styleTray .tray-group').forEach(g=>{if(g.id!=='grp-fav'||favStyles.length)g.hidden=![...g.querySelectorAll('.swatch')].some(c=>!c.hidden)});
  document.querySelectorAll('#trayTone button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tone===toneFilter)));
}
document.querySelectorAll('#trayTone button').forEach(b=>b.onclick=()=>{toneFilter=b.dataset.tone;filterStyles()});
document.querySelectorAll('#trayJump button').forEach(b=>b.onclick=()=>{
  const g=$('grp-'+b.dataset.g); if(!g||g.hidden)return; setGroupOpen(b.dataset.g,true);
  g.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
});
// Worn: scuffs, faded letters and off-center printing, over any style
$('agedTray').checked=$('setAged').checked=aged;
function setAged(on){aged=!!on;store.set('fb.aged',aged);$('agedTray').checked=$('setAged').checked=aged;styleScope();scheduleAtlas()}
$('agedTray').onchange=()=>setAged($('agedTray').checked); $('setAged').onchange=()=>setAged($('setAged').checked);
buildStyles();
// Hovering previews on the board only; tapping tries a style, and Use (or a second tap) keeps it
function previewStyle(id){$('board').dataset.style=id||trying||styleId;requestAnimationFrame(fitFill);scheduleAtlas()}
function noteFor(){trayBar()}
$('styleTray').addEventListener('mouseleave',()=>previewStyle(null));
$('styleTray').addEventListener('focusout',e=>{if(!$('styleTray').contains(e.relatedTarget))previewStyle(null)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&trying)cancelTry()});
let styleTimer=null;
function setStyleAuto(sec){clearInterval(styleTimer);styleTimer=sec?setInterval(()=>stepStyle(1),sec*1000):null;$('styleAuto').value=String(sec);store.set('fb.styleAuto',sec)}
$('styleAuto').onchange=()=>setStyleAuto(+$('styleAuto').value);
applyStyle(styleId); setStyleAuto(+store.get('fb.styleAuto',0)||0);
renderSlots();

