// Art: pictures and animations drawn in color tiles.
// Art: pictures drawn in color tiles, and short animations.
// Rows are 22 cells: r o y g b v w are color tiles, '.' is blank, capitals and digits are printed letters. Shorter rows are centered.
const ART_C='roygbv';
const ART=[
  {id:'heart',name:'Heart',rows:['.rr.rr.','rrrrrrr','rrrrrrr','.rrrrr.','..rrr..','...r...']},
  {id:'sunset',name:'Sunset',rows:['vvvvvvvvvvvvvvvvvvvvvv','ooooooooyyyyyyoooooooo','ooooooyyyyyyyyyyoooooo','rrrrryyyyyyyyyyyyrrrrr','bbbbbbbbbwwwwbbbbbbbbb','bbbbbbbwwbbbbwwbbbbbbb']},
  {id:'rainbow',name:'Rainbow',rows:['rrrrrrrrrrrrrrrrrrrrrr','oooooooooooooooooooooo','yyyyyyyyyyyyyyyyyyyyyy','gggggggggggggggggggggg','bbbbbbbbbbbbbbbbbbbbbb','vvvvvvvvvvvvvvvvvvvvvv']},
  {id:'smile',name:'Smile',rows:['.yyyyyy.','yy.yy.yy','yyyyyyyy','y.yyyy.y','yy....yy','.yyyyyy.']},
  {id:'cake',name:'Birthday cake',rows:['HAPPY BIRTHDAY','y..y..y','w..w..w','vvvvvvvvvvvvv','ooooooooooooo','vvvvvvvvvvvvv']},
  {id:'ciao',name:'Ciao',rows:['gggggggwwwwwwwwrrrrrrr','','CIAO!','','','gggggggwwwwwwwwrrrrrrr']},
  {id:'italy',name:'Italian flag',rows:['gggggggwwwwwwwwrrrrrrr','gggggggwwwwwwwwrrrrrrr','gggggggwwwwwwwwrrrrrrr','gggggggwwwwwwwwrrrrrrr','gggggggwwwwwwwwrrrrrrr','gggggggwwwwwwwwrrrrrrr']},
  {id:'norway',name:'Norwegian flag',rows:['rrrrrrwbbwrrrrrrrrrrrr','wwwwwwwbbwwwwwwwwwwwww','bbbbbbbbbbbbbbbbbbbbbb','bbbbbbbbbbbbbbbbbbbbbb','wwwwwwwbbwwwwwwwwwwwww','rrrrrrwbbwrrrrrrrrrrrr']},
  // Animated pieces: frame(n) returns the rows for frame n; every is the time between frames in ms
  {id:'wave',name:'Rainbow wave',every:1400,frame:n=>Array.from({length:6},(_,r)=>Array.from({length:22},(_,c)=>ART_C[((c+r*2-n)%6+6)%6]).join(''))},
  {id:'sparkle',name:'Sparkle',every:1000,frame:()=>{const g=Array.from({length:6},()=>Array(22).fill('.'));for(let i=0;i<16;i++)g[Math.random()*6|0][Math.random()*22|0]=Math.random()<.7?'w':'y';return g.map(r=>r.join(''))}},
  {id:'rain',name:'Rain',every:750,frame:n=>{artRain=artRain.map(([r,c])=>[r+1,c]).filter(([r])=>r<6);for(let i=0;i<4;i++)artRain.push([0,Math.random()*22|0]);const g=Array.from({length:6},()=>Array(22).fill('.'));artRain.forEach(([r,c])=>{g[r][c]=r===5?'w':'b'});return g.map(r=>r.join(''))}},
  {id:'heartbeat',name:'Heartbeat',every:800,frame:n=>n%2?['.rr.rr.','rrrrrrr','rrrrrrr','.rrrrr.','..rrr..','...r...']:['','..r.r..','.rrrrr.','..rrr..','...r...','']}
];
const ART_BY=Object.fromEntries(ART.map(a=>[a.id,a]));
let artRain=[], artN=0, artCur=store.get('fb.art','heart');
function artCells(rows){
  const cells=new Array(COLS*ROWS).fill(0);
  rows.slice(0,ROWS).forEach((row,r)=>{
    const left=Math.max(0,Math.floor((COLS-row.length)/2));
    [...row].slice(0,COLS).forEach((ch,c)=>{cells[r*COLS+left+c]=ch==='.'||ch===' '?0:/[roygbvw]/.test(ch)?IDX.get('{'+ch+'}'):IDX.get(ch)??0});
  });
  return cells;
}
const artSpeed=()=>+store.get('fb.artSpeed',1)||1;
function showArt(id){
  const a=ART_BY[id]; if(!a)return;
  if(a.frame){if(mode!=='art'||artCur!==id)startArt(id);return}
  schedDriving=schedOn; try{stopModes()}finally{schedDriving=false}
  artCur=id; store.set('fb.art',id);
  send('',{cells:artCells(a.rows),label:'Picture: '+a.name});
  artMark(id);
}
function startArt(id){
  const a=ART_BY[id]; if(!a)return; if(!a.frame){showArt(id);return}
  const wasSched=schedOn; schedDriving=wasSched; try{stopModes()}finally{schedDriving=false}
  mode='art'; artCur=id; artN=0; artRain=[]; store.set('fb.mode','art'); store.set('fb.art',id);
  const tick=()=>{send('',{cells:artCells(a.frame(artN++)),direct:artN>1,pattern:()=>0,label:'Animation: '+a.name})};
  tick(); timer=setInterval(tick,a.every*artSpeed());
  $('artStop').hidden=false; artMark(id); setStatus(busy?'Flipping':'Showing');
}
function artMark(id){document.querySelectorAll('.artcard').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===id&&(mode==='art'||!ART_BY[id].frame))))}
$('artStop').onclick=()=>stopModes();
$('artSpeed').value=String(artSpeed()); $('artSpeed').onchange=()=>{store.set('fb.artSpeed',+$('artSpeed').value);if(mode==='art')startArt(artCur)};
(function buildArt(){
  ART.forEach(a=>{
    const b=document.createElement('button'); b.type='button'; b.className='artcard'; b.dataset.id=a.id; b.setAttribute('aria-pressed','false');
    const pv=document.createElement('div'); pv.className='pv art-pv'; pv.setAttribute('aria-hidden','true');
    artCells(a.frame?a.frame(a.id==='heartbeat'?1:3):a.rows).forEach(idx=>{const c=document.createElement('i'),ch=CHARS[idx];if(ch.length===3)c.style.background='var('+COLORS[ch[1]]+')';else c.textContent=ch===' '?'':ch;pv.appendChild(c)});
    const nm=document.createElement('b'); nm.textContent=a.name+(a.frame?' (animated)':'');
    b.append(pv,nm); b.onclick=()=>a.frame?startArt(a.id):showArt(a.id);
    $(a.frame?'artAnims':'artPics').appendChild(b);
  });
  artRain=[];
})();

