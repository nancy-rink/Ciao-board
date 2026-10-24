// Shared basics (constants, storage, $), the tiles, the canvas renderer for Smooth mode, and flap paths.
const COLS=22, ROWS=6; let TICK=110;
const COLORS={r:'--c-r',o:'--c-o',y:'--c-y',g:'--c-g',b:'--c-b',v:'--c-v',w:'--c-w'};
const CHARS=[' ',...'ABCDEFGHIJKLMNOPQRSTUVWXYZ',...'1234567890',...'!@#$()-+&=;:\'"%,./?°',...'ÁÉÍÓÚÑÃÕÇÂÊÔÀÜÖŐŰÈÎÏÛÙËŒ','{r}','{o}','{y}','{g}','{b}','{v}','{w}'];
const IDX=new Map(CHARS.map((c,i)=>[c,i]));
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const $=id=>document.getElementById(id);
const store={get(k,d){try{const v=localStorage.getItem('beta2.'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem('beta2.'+k,JSON.stringify(v))}catch(e){}}};

// Build tiles
const grid=$('grid'); const tiles=[];
for(let i=0;i<COLS*ROWS;i++){
  const t=document.createElement('div'); t.className='t';
  t.innerHTML='<div class="h u"><span></span></div><div class="h d"><span></span></div><div class="f"><span></span></div><div class="g"><span></span></div>';
  const [u,d,f,g]=t.children;
  const col=i%COLS, row=Math.floor(i/COLS), rnd=Math.random;
  t.style.cssText='--spd-r:'+(.86+rnd()*.28).toFixed(3)+';--jx:'+((rnd()-.5)*.5).toFixed(3)+';--jy:'+((rnd()-.5)*.35).toFixed(3)+';--fd:'+(rnd()*.35).toFixed(3)+';--sx:'+(rnd()*100|0)+'%;--sy:'+([10,50,50,90][rnd()*4|0]+((rnd()-.5)*12|0))+'%;--sw:'+(1+rnd()*2.2).toFixed(2)+';--sh:'+(.5+rnd()*1.2).toFixed(2);
  if(col===0&&row%2===0)t.classList.add('edge');
  if(row>=3)t.classList.add('lo');
  const tile={el:t,u,d,f,g,col,row,cur:0,target:0,delay:0,flip:false};
  f.addEventListener('animationend',()=>{f.className='f'});
  g.addEventListener('animationend',()=>{paint(tile.d,tile.cur);g.className='g'});
  u.addEventListener('animationend',()=>t.classList.remove('twitch'));
  grid.appendChild(t); tiles.push(tile);
}
// Smooth mode draws the whole board on one canvas. Every tile face (each letter and color tile, in the current style's
// colors, font and size) is drawn once into a sprite sheet; during a flip each frame just copies faces onto the canvas,
// squashing the falling flap toward the split. The browser then has one layer to manage instead of hundreds of
// animated, restyled, repainted flap elements, which is what slows TVs down. Rebuilt (debounced) when the style,
// the size or Smooth mode changes; Double Arrow's dark lower rows get their own sheet row.
let cvOn=false, cv=null, cvx=null, cvSheet=null, cvW=0, cvH=0, cvRun=false, atlasT=null, atlasGen=0;
// Until start.js has run, work that needs every file waits; start.js then runs whatever was asked for meanwhile.
let ready=false; const whenReady=[];
const onReady=fn=>{if(ready)fn();else if(!whenReady.includes(fn))whenReady.push(fn)};
function scheduleAtlas(){if(!ready){onReady(scheduleAtlas);return}clearTimeout(atlasT);atlasT=setTimeout(buildAtlas,60)}
function cvPalette(t){
  const cs=getComputedStyle(t.el), span=getComputedStyle(t.u.firstChild), v=k=>cs.getPropertyValue(k).trim();
  return {tile:getComputedStyle(t.d).backgroundColor, hi:v('--tile-hi')||v('--tile'), seam:v('--seam')||'#000', ink:cs.color,
    r:parseFloat(getComputedStyle(t.u).borderTopLeftRadius)||0, span, colors:Object.fromEntries('roygbvw'.split('').map(c=>[c,v('--c-'+c)]))};
}
async function cvDrawRow(x,row,pal,w,h,dpr){
  const cs=pal.span, size=parseFloat(cs.fontSize)*dpr, font=cs.fontStyle+' '+cs.fontWeight+' '+size+'px '+cs.fontFamily;
  try{await document.fonts.load(font,'ABCÁ')}catch(e){}
  const st=parseFloat(cs.fontStretch)||100, r=pal.r*dpr, oy=row*h;
  CHARS.forEach((ch,i)=>{
    const ox=i*w; x.save(); x.beginPath(); if(x.roundRect)x.roundRect(ox,oy,w,h,r);else x.rect(ox,oy,w,h); x.clip();
    if(ch.length===3){x.fillStyle=pal.colors[ch[1]];x.fillRect(ox,oy,w,h);x.fillStyle='rgba(255,255,255,.06)';x.fillRect(ox,oy,w,h/2)}
    else{
      const g=x.createLinearGradient(0,oy,0,oy+h/2); g.addColorStop(0,pal.hi); g.addColorStop(1,pal.tile);
      x.fillStyle=g; x.fillRect(ox,oy,w,h/2); x.fillStyle=pal.tile; x.fillRect(ox,oy+h/2,w,h/2);
      if(ch!==' '){
        x.font=font; if('fontStretch' in x)x.fontStretch=st<56?'ultra-condensed':st<69?'extra-condensed':st<81?'condensed':st<94?'semi-condensed':st<106?'normal':st<119?'semi-expanded':'expanded';
        x.fillStyle=pal.ink; x.textAlign='center'; x.textBaseline='alphabetic';
        // Center the line box the way the tiles' flexbox does: baseline sits (ascent - descent) / 2 below the middle
        const m=x.measureText('H'), asc=m.fontBoundingBoxAscent??size*.8, desc=m.fontBoundingBoxDescent??size*.2;
        x.fillText(ch,ox+w/2,oy+h/2+(asc-desc)/2);
      }
    }
    x.restore();
    x.fillStyle=pal.seam; x.fillRect(ox,oy+h/2-Math.max(1,dpr)/2,w,Math.max(1,dpr));
  });
}
// Display styles aren't split-flap boards: a nixie tube glows, a marquee letter slots in, wood type stamps down. Their letters change
// in place, straight to the new one, with the style's own animation, and always as page elements so the glow and texture show.
const DISPLAYS={nixie:1,marquee:1,letterboard:1,letterpress:1,stitch:1,flipdot:1};
const isDisplay=()=>!!DISPLAYS[(document.getElementById('board')||{dataset:{}}).dataset.style];
async function buildAtlas(){
  const gen=++atlasGen;
  if(!liteNow||reduce||!tiles.length||isDisplay()){
    if(cvOn){cvOn=false;grid.classList.remove('canvas');if(cv)cv.hidden=true;tiles.forEach(t=>{t.cvA=null;paint(t.u,t.cur);paint(t.d,t.cur)})}
    // A flip cut short by the change of style leaves its lower half on the old letter; a display style never flips to cover it
    else if(isDisplay())tiles.forEach(t=>{paint(t.u,t.cur);paint(t.d,t.cur)});
    return;
  }
  const gr=grid.getBoundingClientRect(); if(gr.width<10)return;
  const dpr=Math.min(2,window.devicePixelRatio||1);
  tiles.forEach(t=>{const r=t.el.getBoundingClientRect();t.geo=[(r.left-gr.left)*dpr,(r.top-gr.top)*dpr,r.width*dpr,r.height*dpr]});
  const w=Math.ceil(tiles[0].geo[2]), h=Math.ceil(tiles[0].geo[3]);
  const top=cvPalette(tiles[0]), low=cvPalette(tiles[tiles.length-1]), two=low.tile!==top.tile||low.ink!==top.ink;
  const sheet=document.createElement('canvas'); sheet.width=w*CHARS.length; sheet.height=h*(two?2:1);
  const sx=sheet.getContext('2d'); if(!sx)return;
  await cvDrawRow(sx,0,top,w,h,dpr); if(two)await cvDrawRow(sx,1,low,w,h,dpr);
  if(gen!==atlasGen)return;
  if(!cv){cv=document.createElement('canvas');cv.id='gridCanvas';cv.setAttribute('aria-hidden','true');grid.after(cv);cvx=cv.getContext('2d')}
  Object.assign(cv.style,{left:grid.offsetLeft+'px',top:grid.offsetTop+'px',width:gr.width+'px',height:gr.height+'px'});
  cv.width=Math.round(gr.width*dpr); cv.height=Math.round(gr.height*dpr);
  tiles.forEach(t=>{t.cvRow=two&&t.el.classList.contains('lo')?1:0});
  cvSheet=sheet; cvW=w; cvH=h; cv.hidden=false;
  if(!cvOn){cvOn=true;grid.classList.add('canvas')}
  cvKick();
}
// One frame: copy every tile's face, and draw flaps mid-turn for tiles that are flipping
const easeIn=q=>q*q, easeOut=q=>1-(1-q)*(1-q);
function cvFace(idx,row,sy,sh,dx,dy,dw,dh){cvx.drawImage(cvSheet,idx*cvW,row*cvH+sy*cvH,cvW,sh*cvH,dx,dy,dw,dh)}
function cvDraw(now){
  cvx.clearRect(0,0,cv.width,cv.height);
  let moving=false;
  for(const t of tiles){
    const [x,y,w,h]=t.geo, a=t.cvA, row=t.cvRow;
    if(!a||now-a.t0>=a.d){t.cvA=null;cvFace(t.cur,row,0,1,x,y,w,h);continue}
    moving=true;
    const p=(now-a.t0)/a.d;
    cvFace(a.to,row,0,.5,x,y,w,h/2);       // behind the falling flap: the new letter's top
    cvFace(a.from,row,.5,.5,x,y+h/2,w,h/2); // the old letter's bottom, until the new flap covers it
    if(p<.5){                               // the old top flap falls toward the split
      const q=easeIn(p*2), fh=h/2*Math.cos(q*Math.PI/2);
      cvFace(a.from,row,0,.5,x,y+h/2-fh,w,fh);
      cvx.fillStyle='rgba(0,0,0,'+(.45*q).toFixed(3)+')'; cvx.fillRect(x,y+h/2-fh,w,fh);
    }else{                                  // the new bottom flap swings down into place
      const q=easeOut((p-.5)*2), fh=h/2*Math.sin(q*Math.PI/2);
      cvFace(a.to,row,.5,.5,x,y+h/2,w,fh);
      cvx.fillStyle='rgba(255,255,255,'+(.18*(1-q)).toFixed(3)+')'; cvx.fillRect(x,y+h/2,w,fh);
    }
  }
  return moving;
}
function cvFrame(){const more=cvDraw(performance.now());if(more||busy)requestAnimationFrame(cvFrame);else cvRun=false}
function cvKick(){if(cvOn&&cvSheet&&!cvRun){cvRun=true;requestAnimationFrame(cvFrame)}}
addEventListener('resize',scheduleAtlas);
if(document.fonts)document.fonts.addEventListener('loadingdone',scheduleAtlas);
// Real text on each face. While the canvas draws the board (Smooth mode) the hidden faces are left alone, and are repainted when it stops.
function paint(face,idx){
  if(cvOn)return;
  const c=CHARS[idx], span=face.firstChild;
  if(c.length===3){face.style.background='var('+COLORS[c[1]]+')';span.textContent=''}
  else{face.style.background='';span.textContent=c}
}
// Every flap a tile will make is worked out when the message arrives (planPath), so the animation only steps through a list.
// Direct tiles (art animations) go straight to their target in one flap; everything else steps through the alphabet like a real board.
// In Smooth mode a long run skips ahead, so no tile takes more than about 8 flaps to arrive.
function planPath(t){
  const L=CHARS.length; t.path=[]; t.pi=0;
  if(t.cur===t.target)return;
  if(t.direct||isDisplay()){t.path.push(t.target);return}
  for(let c=t.cur;c!==t.target;){const left=(t.target-c+L)%L;c=(c+(liteNow&&left>8?Math.ceil(left/8):1))%L;t.path.push(c)}
}
function step(tile){
  const old=tile.cur; tile.cur=tile.path[tile.pi++];
  if(cvOn){tile.cvA={from:old,to:tile.cur,t0:performance.now(),d:TICK*.9};return}
  if(isDisplay()){paint(tile.u,tile.cur);paint(tile.d,tile.cur);tile.flip=!tile.flip;tile.el.dataset.k=tile.flip?'a':'b';return}
  paint(tile.u,tile.cur);
  if(reduce){paint(tile.d,tile.cur);return}
  paint(tile.d,old); paint(tile.f,old); paint(tile.g,tile.cur);
  tile.flip=!tile.flip; const k=tile.flip?'a':'b';
  tile.f.className='f '+k; tile.g.className='g '+k+(tile.cur===tile.target?' land':'');
}

// The viewer may attach window.claude a moment after the page starts, so wait for it.
async function useCap(name){
  for(let i=0;i<80&&!(window.claude&&typeof window.claude.use==='function');i++)await new Promise(r=>setTimeout(r,100));
  if(!(window.claude&&typeof window.claude.use==='function'))return null;
  try{return await window.claude.use(name)}catch(e){return null}
}
