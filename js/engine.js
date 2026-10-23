// Laying out text, the flip engine, patterns, Smooth mode, restyle and idle motion, frame timing.
// Parse + layout
function tokenize(str){
  // NFC first, so a letter typed as base + accent mark (as some keyboards do) is one character, then uppercase (é → É)
  const out=[]; const s=str.normalize('NFC').toUpperCase(); let i=0;
  while(i<s.length){
    const m=s.slice(i).match(/^\{([ROYGBVW])\}/);
    if(m){out.push('{'+m[1].toLowerCase()+'}');i+=3;continue}
    let ch=s[i]; if(ch==='\n'){out.push('\n');i++;continue}
    if(ch==='’'||ch==='‘')ch="'"; if(ch==='“'||ch==='”')ch='"';
    // Letters without their own flap fall back to the plain letter (Ł → L, Č → C, Ř → R) rather than a blank
    if(!IDX.has(ch)){const base=({'Ł':'L','Ø':'O','Đ':'D','ß':'S','Æ':'A','Œ':'O'})[ch]||ch.normalize('NFD').replace(/[\u0300-\u036f]/g,'');if(IDX.has(base))ch=base}
    out.push(IDX.has(ch)?ch:' '); i++;
  }
  return out;
}
function layout(str){
  const toks=tokenize(str); const lines=[];
  let para=[];
  const flush=()=>{
    const words=[]; let w=[];
    for(const t of para){ if(t===' '){ if(w.length){words.push(w);w=[]} } else w.push(t) }
    if(w.length)words.push(w);
    if(!words.length){lines.push([]);return}
    let line=[];
    for(let word of words){
      while(word.length>COLS){ if(line.length){lines.push(line);line=[]} lines.push(word.slice(0,COLS)); word=word.slice(COLS) }
      if(!word.length)continue;
      const need=line.length?line.length+1+word.length:word.length;
      if(need>COLS){lines.push(line);line=[...word]}
      else line=line.length?[...line,' ',...word]:[...word];
    }
    if(line.length)lines.push(line);
  };
  for(const t of toks){ if(t==='\n'){flush();para=[]} else para.push(t) }
  flush();
  while(lines.length&&!lines[lines.length-1].length)lines.pop();
  return lines;
}
// Some styles set their rows flush left, like Japanese platform boards
function alignLeft(){const b=document.getElementById('board');return !!b&&b.dataset.style==='patapata'}
function toTargets(str){
  const lines=layout(str); const used=lines.length; const shown=lines.slice(0,ROWS);
  const top=Math.floor((ROWS-shown.length)/2);
  const cells=new Array(COLS*ROWS).fill(0);
  const leftAlign=alignLeft();
  shown.forEach((ln,r)=>{const left=leftAlign?Math.min(1,COLS-ln.length):Math.floor((COLS-ln.length)/2); ln.forEach((t,c)=>{cells[(top+r)*COLS+left+c]=IDX.get(t)??0})});
  return {cells,used};
}

// Engine
// Flip patterns: how many ticks each tile waits before it starts, by column and row
const PATTERNS={
  wave:(c,r)=>c*0.6+r*1.2,
  rows:(c,r)=>r*3+c*0.1,
  diagonal:(c,r)=>(c+r*3)*0.45,
  center:(c,r)=>Math.hypot(Math.abs(c-(COLS-1)/2),Math.abs(r-(ROWS-1)/2)*2.2)*0.75,
  outside:(c,r)=>Math.max(0,8-Math.hypot(Math.abs(c-(COLS-1)/2),Math.abs(r-(ROWS-1)/2)*2.2)*0.75),
  random:()=>Math.random()*12,
  together:()=>0
};
const anim=Object.assign({pattern:'wave',motion:'real',finish:'depth',frame:'style',restyle:'flip',boot:true,idle:true,perf:'auto'},store.get('fb.anim',{}));
// Smooth mode drops the costly extras (shadows, glare, shading layers, the bounce, style flip-ins, twitches) for TVs and other slow screens.
// Automatic turns it on in TV mode, or once the board measures that flips run slowly on this screen.
const tvParam=new URLSearchParams(location.search).has('tv');
let perfSlow=store.get('fb.perfSlow',false);
const lite=()=>anim.perf==='smooth'||(anim.perf==='auto'&&(tvParam||perfSlow));
let liteNow=false; // cached for the flip loop
function applyAnim(){
  const b=document.body.classList;
  b.toggle('real',anim.motion==='real'); b.toggle('depth',anim.finish!=='flat'); b.toggle('glare',anim.finish==='glare'); liteNow=lite(); b.toggle('lite',liteNow); scheduleAtlas();
  if(anim.frame==='style')delete document.body.dataset.frame; else document.body.dataset.frame=anim.frame;
  ['pattern','motion','finish','frame','restyle','perf'].forEach(k=>{const el=$('anim-'+k);if(el)el.value=anim[k]});
  const pn=$('perfNote'); if(pn)pn.textContent=anim.perf!=='auto'?'':lite()?(tvParam?'Smooth mode is on, because this is TV mode.':'Smooth mode is on, because flips were running slowly on this screen.'):'Best quality is on. The board switches to Smooth by itself if flips run slowly.';
  ['boot','idle'].forEach(k=>{const el=$('anim-'+k);if(el)el.checked=!!anim[k]});
  store.set('fb.anim',anim);
}
// A new style ripples across the board in the flip pattern: each tile turns edge-on, takes the new look, and turns back
let restyleT=[];
function restyleCascade(from){
  restyleT.forEach(clearTimeout); restyleT=[];
  tiles.forEach(t=>{t.el.removeAttribute('data-style');t.el.classList.remove('restyle')});
  if(reduce||anim.restyle!=='flip'||lite()||!from||from===styleId)return;
  const p=PATTERNS[anim.pattern]||PATTERNS.wave, half=Math.max(60,Math.round(TICK*0.6)), groups=new Map();
  tiles.forEach(t=>{
    t.el.dataset.style=from;
    const d=Math.round(p(t.col,t.row)*TICK*0.55);
    if(!groups.has(d))groups.set(d,[]); groups.get(d).push(t);
  });
  document.documentElement.style.setProperty('--restyle',half*2+'ms');
  groups.forEach((g,d)=>{
    restyleT.push(setTimeout(()=>{g.forEach(t=>t.el.classList.add('restyle'));click(g.length,g.map(t=>t.col))},d));
    restyleT.push(setTimeout(()=>g.forEach(t=>t.el.removeAttribute('data-style')),d+half));
    restyleT.push(setTimeout(()=>g.forEach(t=>t.el.classList.remove('restyle')),d+half*2+30));
  });
}
// Now and then a single flap lifts and resettles, so a still board never looks frozen
setTimeout(function idleTwitch(){
  setTimeout(idleTwitch,35000+Math.random()*85000);
  if(!anim.idle||reduce||lite()||busy||document.hidden||!tiles.length)return;
  const t=tiles[Math.random()*tiles.length|0];
  t.el.classList.remove('twitch'); void t.el.offsetWidth; t.el.classList.add('twitch');
  setTimeout(()=>click(1,[t.col]),110);
},40000);
// Re-run the current message from a few flaps back, to show off a new pattern or motion
function replay(){
  if(busy||reduce||lastSent==null)return;
  tiles.forEach(t=>{t.cur=(t.target-3+CHARS.length)%CHARS.length;paint(t.u,t.cur);paint(t.d,t.cur)});
  send(lastSent);
}
let busy=false, last=0, acc=0, movedThisRun=false, lastSent=null, lastOpts={}, boardLabel=null, booted=false, active=[];
// While a channel is previewed (ui.js), whatever was running keeps going but its updates wait in heldSend instead of flipping
let previewHold=false, heldSend=null;
// opts.cells sends an exact grid (art) instead of laying out text; opts.direct flips each tile straight to its target; opts.label is read to screen readers
function send(str,opts){
  opts=opts||{};
  if(previewHold&&!opts.preview){heldSend=[str,opts];return}
  lastSent=str; lastOpts=opts.preview?{}:opts; boardLabel=opts.label||null;
  const cells=opts.cells||toTargets(str).cells;
  // Power-on: the first time anything is shown, every tile spins up from a random spot
  const boot=!booted&&anim.boot&&!reduce; booted=true;
  tiles.forEach((t,i)=>{
    t.target=cells[i]; t.direct=!!opts.direct;
    if(reduce){t.cur=t.target;paint(t.u,t.cur);paint(t.d,t.cur);return}
    if(boot){t.cur=((t.target-(12+Math.random()*30|0))%CHARS.length+CHARS.length)%CHARS.length;paint(t.u,t.cur);paint(t.d,t.cur);t.delay=Math.random()*4|0;return}
    const p=opts.pattern||PATTERNS[anim.pattern]||PATTERNS.wave;
    t.delay=p(i%COLS,Math.floor(i/COLS))+(anim.motion==='real'&&!opts.direct&&Math.random()<.25?1:0)|0;
  });
  if(!reduce){tiles.forEach(planPath);active=tiles.filter(t=>t.path.length)}
  setStatus('Flipping');
  // All the planning above is done before the first frame of movement
  if(!busy&&active.length){busy=true;last=0;acc=0;requestAnimationFrame(()=>requestAnimationFrame(loop))}
  else if(!busy){setStatus('Showing');speakBoard()}
  cvKick();
}
// Frame timing while flipping: if most frames come in late on two runs in a row, Automatic switches to Smooth mode
let perfFrames=0, perfLate=0, perfStrikes=0;
function perfCheck(){
  // Two slow runs in a row, so one busy moment doesn't count
  const slow=perfFrames>=40&&perfLate/perfFrames>.35; perfStrikes=slow?perfStrikes+1:0;
  if(anim.perf==='auto'&&!lite()&&perfStrikes>=2){
    perfSlow=true; store.set('fb.perfSlow',true); applyAnim();
    toast('Switched to Smooth mode so flips run better on this screen. Change it in Settings → Motion.');
  }
  perfFrames=perfLate=0;
}
function loop(ts){
  if(last){perfFrames++;if(ts-last>45)perfLate++}
  if(!last)last=ts; acc+=ts-last; last=ts;
  let flipped=0; const cols=[];
  while(acc>=TICK&&active.length){
    acc-=TICK;
    for(const t of active){
      if(t.delay>0){t.delay--;continue}
      step(t); flipped++; if(cols.length<24)cols.push(t.col);
    }
    active=active.filter(t=>t.pi<t.path.length);
  }
  if(flipped){click(flipped,cols);movedThisRun=true}
  if(active.length){requestAnimationFrame(loop)}
  else{busy=false;last=0;acc=0;perfCheck();setStatus('Showing');if(movedThisRun)landed();movedThisRun=false;speakBoard()}
}
const MODE_TAB={rotating:'saved',clock:'clock',weather:'weather',surf:'surf',calendar:'calendar',news:'news',art:'art'};
let schedDriving=false, schedOn=false;
const MODE_NAME={'':'your message',rotating:'saved messages',clock:'the clock',weather:'the weather',surf:'the surf report',calendar:'your calendar',news:'BBC headlines',book:'Moby-Dick',art:'an animation'};
const COLOR_WORD={r:'red',o:'orange',y:'yellow',g:'green',b:'blue',v:'violet',w:'white'};
let lastSpoken='';
function speakBoard(){
  if(boardLabel){if(boardLabel!==lastSpoken){lastSpoken=boardLabel;$('boardText').textContent=boardLabel}return}
  const lines=layout(lastSent||'').slice(0,ROWS).map(l=>l.filter(t=>t.length!==3).join('').trim()).filter(Boolean);
  const text=lines.length?lines.join('. ')+'.':'The board is blank.';
  if(text===lastSpoken)return; lastSpoken=text; $('boardText').textContent=text;
}
function setStatus(word){
  const st=$('status'), f=word==='Flipping';
  const what=mode===''&&lastSent===''?'a blank board':(MODE_NAME[mode]||'your message');
  const pvName=typeof pv!=='undefined'&&pv?CH[pv.id].name:'';
  let h=pvName?'<i class="dot"></i><span>Previewing <b>'+pvName+'</b></span>':'<i class="dot"></i><span>Showing <b>'+what+'</b></span>';
  if(schedOn){try{const n=schedNextLabel();if(n)h+='<span class="nxt">Day plan, next: '+n+'</span>'}catch(e){}}
  if(st.dataset.h!==h){st.innerHTML=h;st.dataset.h=h} st.classList.toggle('flipping',f);
  st.classList.toggle('previewing',!!pvName);
  try{updateSubs()}catch(e){}
  try{renderChannels()}catch(e){}
}

