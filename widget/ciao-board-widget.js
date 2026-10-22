// Ciao Board widget for Scriptable (https://scriptable.app), an iPhone app that runs JavaScript widgets.
// Draws a split-flap board as a Home Screen widget, Small, Medium or Large. Tap it to open the full board.
//
// Set what it shows with the widget's Parameter (long-press the widget, Edit Widget, Parameter):
//   (empty)            BBC top stories, a new headline at each refresh
//   news world         a BBC section: top, world, uk, business, technology, science, sport
//   clock              the time and date (iPhone redraws widgets every 15 minutes or so, so the minutes lag)
//   art heart          a color-tile picture: heart, sunset, rainbow, smile, cake, ciao, italy, norway
//   art                a different picture each day
//   CIAO NANCY / 7:45  anything else is a message; / starts a new line, {r} {o} {y} {g} {b} {v} {w} are color tiles
// Add a style at the end with @, for example:  clock @daylight   or   CIAO! @metro
// Styles: classic daylight rail harbor glow mint solari cifra worn pragotron metropolitana standard doublearrow
//         ulm olympia jetage patapata ekimei caslon dangan butterfly metro mexico68 filete calcadao cinetica

const BOARD_URL='https://nancy-rink.github.io/Ciao-board/';
const NEWS_URL='https://raw.githubusercontent.com/nancy-rink/Ciao-board/news-data/news.json';
const STYLES={"classic":{"frame":"#0b0b0b","tile":"#1c1c1c","ink":"#f1ece2","seam":"#000","r":"#d8432e","o":"#ee8a2b","y":"#f2c94c","g":"#3fa66b","b":"#2f7fd1","v":"#7d55c7","w":"#f1ece2"},"daylight":{"frame":"#f7f5f0","tile":"#fbfaf6","ink":"#1b1a17","seam":"#d3cdc0","r":"#d8432e","o":"#ee8a2b","y":"#f2c94c","g":"#3fa66b","b":"#2f7fd1","v":"#7d55c7","w":"#1b1a17"},"rail":{"frame":"#08110d","tile":"#1d4a35","ink":"#f4f1e6","seam":"#0a1f15","r":"#d8432e","o":"#ee8a2b","y":"#f2c94c","g":"#7cc47f","b":"#2f7fd1","v":"#7d55c7","w":"#f1ece2"},"harbor":{"frame":"#081220","tile":"#14294a","ink":"#f0dfbd","seam":"#06101f","r":"#d8432e","o":"#ee8a2b","y":"#f2c94c","g":"#3fa66b","b":"#5aa6ee","v":"#7d55c7","w":"#f1ece2"},"glow":{"frame":"#040303","tile":"#120e0c","ink":"#ff9a3c","seam":"#000","r":"#d8432e","o":"#ee8a2b","y":"#f2c94c","g":"#3fa66b","b":"#2f7fd1","v":"#7d55c7","w":"#f1ece2"},"solari":{"frame":"#050607","tile":"#141516","ink":"#f4f4f0","seam":"#000","r":"#d8432e","o":"#ee8a2b","y":"#f2c94c","g":"#3fa66b","b":"#2f7fd1","v":"#7d55c7","w":"#f1ece2"},"cifra":{"frame":"#3a2416","tile":"#e9e2d0","ink":"#1d1a16","seam":"#8f8576","r":"#d8432e","o":"#ee8a2b","y":"#f2c94c","g":"#3fa66b","b":"#2f7fd1","v":"#7d55c7","w":"#1d1a16"},"worn":{"frame":"#0e0c09","tile":"#23201b","ink":"#e6d8b8","seam":"#050403","r":"#d8432e","o":"#ee8a2b","y":"#f2c94c","g":"#3fa66b","b":"#2f7fd1","v":"#7d55c7","w":"#f1ece2"},"mint":{"frame":"#f6fbf9","tile":"#cfe9df","ink":"#10443a","seam":"#a7cfc1","r":"#d8432e","o":"#ee8a2b","y":"#f2c94c","g":"#3fa66b","b":"#2f7fd1","v":"#7d55c7","w":"#10443a"},"pragotron":{"frame":"#0c0e10","tile":"#2a2e33","ink":"#e8ebee","seam":"#0a0b0c","r":"#d8432e","o":"#ee8a2b","y":"#f2c94c","g":"#3fa66b","b":"#2f7fd1","v":"#7d55c7","w":"#f1ece2"},"metropolitana":{"frame":"#0d0d0d","tile":"#161616","ink":"#f3f1ea","seam":"#000","r":"#d52b1e","o":"#ee8a2b","y":"#f2c94c","g":"#3fa66b","b":"#2f7fd1","v":"#7d55c7","w":"#f1ece2"},"standard":{"frame":"#111111","tile":"#fafafa","ink":"#111111","seam":"#cfcfcf","r":"#e2382d","o":"#ee8a2b","y":"#f2c94c","g":"#1f9a4c","b":"#2f7fd1","v":"#7d55c7","w":"#111111"},"doublearrow":{"frame":"#23262b","tile":"#f7f7f4","ink":"#111111","seam":"#00000055","r":"#b5121b","o":"#ee8a2b","y":"#f2c94c","g":"#3fa66b","b":"#2f7fd1","v":"#7d55c7","w":"#f1ece2"},"ulm":{"frame":"#061a36","tile":"#0b2d5b","ink":"#f5b800","seam":"#020a16","r":"#d8432e","o":"#ee8a2b","y":"#f5b800","g":"#3fa66b","b":"#2f7fd1","v":"#7d55c7","w":"#f1ece2"},"olympia":{"frame":"#b9bdc2","tile":"#fbfbf9","ink":"#1f5f9f","seam":"#c9ced4","r":"#d8432e","o":"#f08c2e","y":"#f2c94c","g":"#3fae5a","b":"#5aa7e0","v":"#7d55c7","w":"#f1ece2"},"jetage":{"frame":"#8f1c22","tile":"#ebe4d6","ink":"#8f1c22","seam":"#cbbfa9","r":"#c8202a","o":"#ee8a2b","y":"#f2c94c","g":"#3fa66b","b":"#2f7fd1","v":"#7d55c7","w":"#f1ece2"},"patapata":{"frame":"#2b2e33","tile":"#141518","ink":"#e8e8e4","seam":"#000","r":"#e43b2f","o":"#ee8a2b","y":"#f2c94c","g":"#2ea24f","b":"#2f7fd1","v":"#7d55c7","w":"#f1ece2"},"ekimei":{"frame":"#d9dbd7","tile":"#fbfbf8","ink":"#1c1d1f","seam":"#c4c7c1","r":"#d8432e","o":"#ee8a2b","y":"#f2c94c","g":"#7ac143","b":"#2f7fd1","v":"#7d55c7","w":"#f1ece2"},"caslon":{"frame":"#e3d6bd","tile":"#1e1b18","ink":"#f4eee2","seam":"#000","r":"#d8432e","o":"#ff7a2a","y":"#f2c94c","g":"#3fa66b","b":"#2f7fd1","v":"#7d55c7","w":"#f1ece2"},"dangan":{"frame":"#e9e5da","tile":"#f6f3ea","ink":"#1a3f8f","seam":"#d3cfc3","r":"#d8432e","o":"#ee8a2b","y":"#f2c94c","g":"#3fa66b","b":"#1a3f8f","v":"#7d55c7","w":"#f1ece2"},"butterfly":{"frame":"#4a2a1c","tile":"#eadfc8","ink":"#3b2116","seam":"#b8955a","r":"#a8452e","o":"#c97a3c","y":"#d8b25a","g":"#6f8f5a","b":"#4f6f8f","v":"#7d55c7","w":"#f1ece2"},"metro":{"frame":"#2a2a2a","tile":"#c4006b","ink":"#ffffff","seam":"#00000040","r":"#e6007e","o":"#f39200","y":"#ffcc00","g":"#00a651","b":"#0072bc","v":"#7d55c7","w":"#f1ece2"},"mexico68":{"frame":"#111111","tile":"#fafafa","ink":"#111111","seam":"#d0d0d0","r":"#e6007e","o":"#ff6a13","y":"#ffd100","g":"#00a651","b":"#00a3e0","v":"#7a2a90","w":"#111111"},"filete":{"frame":"#0f0d0c","tile":"#1a1715","ink":"#f2c14e","seam":"#000","r":"#c8102e","o":"#ee8a2b","y":"#d4a017","g":"#1f8a4c","b":"#2f7fd1","v":"#7d55c7","w":"#f4ead2"},"calcadao":{"frame":"#141414","tile":"#f3efe6","ink":"#141414","seam":"#cfc8b8","r":"#b33a2b","o":"#ee8a2b","y":"#f2c94c","g":"#2f8f6e","b":"#2f7fd1","v":"#7d55c7","w":"#141414"},"cinetica":{"frame":"#121212","tile":"#1a1a1a","ink":"#f4f4f0","seam":"#000","r":"#e63328","o":"#ee8a2b","y":"#f2c94c","g":"#1e9e57","b":"#2459b8","v":"#7d55c7","w":"#f1ece2"}};
const ART={"heart":[".rr.rr.","rrrrrrr","rrrrrrr",".rrrrr.","..rrr..","...r..."],"sunset":["vvvvvvvvvvvvvvvvvvvvvv","ooooooooyyyyyyoooooooo","ooooooyyyyyyyyyyoooooo","rrrrryyyyyyyyyyyyrrrrr","bbbbbbbbbwwwwbbbbbbbbb","bbbbbbbwwbbbbwwbbbbbbb"],"rainbow":["rrrrrrrrrrrrrrrrrrrrrr","oooooooooooooooooooooo","yyyyyyyyyyyyyyyyyyyyyy","gggggggggggggggggggggg","bbbbbbbbbbbbbbbbbbbbbb","vvvvvvvvvvvvvvvvvvvvvv"],"smile":[".yyyyyy.","yy.yy.yy","yyyyyyyy","y.yyyy.y","yy....yy",".yyyyyy."],"cake":["HAPPY BIRTHDAY","y..y..y","w..w..w","vvvvvvvvvvvvv","ooooooooooooo","vvvvvvvvvvvvv"],"ciao":["gggggggwwwwwwwwrrrrrrr","","CIAO!","","","gggggggwwwwwwwwrrrrrrr"],"italy":["gggggggwwwwwwwwrrrrrrr","gggggggwwwwwwwwrrrrrrr","gggggggwwwwwwwwrrrrrrr","gggggggwwwwwwwwrrrrrrr","gggggggwwwwwwwwrrrrrrr","gggggggwwwwwwwwrrrrrrr"],"norway":["rrrrrrwbbwrrrrrrrrrrrr","wwwwwwwbbwwwwwwwwwwwww","bbbbbbbbbbbbbbbbbbbbbb","bbbbbbbbbbbbbbbbbbbbbb","wwwwwwwbbwwwwwwwwwwwww","rrrrrrwbbwrrrrrrrrrrrr"]};
// Letters the board has flaps for; anything else shows as a blank tile
const LETTERS=new Set([...'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#$()-+&=;:\'"%,./?°ÁÉÍÓÚÑÃÕÇÂÊÔÀÜ']);
// Tile grid per widget size: columns across, and how wide a tile is relative to its height
const GRID={small:{cols:7},medium:{cols:16},large:{cols:13},extraLarge:{cols:22}};
// Widget sizes in points on a typical 6.1" iPhone; the image scales to the real size
const SIZE={small:[158,158],medium:[338,158],large:[338,354],extraLarge:[715,354]};

function hex(c){
  c=c.replace('#','');
  if(c.length===3)c=c.split('').map(x=>x+x).join('');
  const a=c.length===8?parseInt(c.slice(6),16)/255:1;
  return new Color('#'+c.slice(0,6),a);
}
function parse(param){
  let p=(param||'').trim(), style='classic';
  const m=p.match(/\s*@([a-z0-9]+)\s*$/i);
  if(m){p=p.slice(0,m.index).trim();if(STYLES[m[1].toLowerCase()])style=m[1].toLowerCase()}
  const w=p.toLowerCase().split(/\s+/);
  if(!p||w[0]==='news')return {kind:'news',section:w[1]||'top',style};
  if(w[0]==='clock'&&w.length===1)return {kind:'clock',style};
  if(w[0]==='art'&&w.length<=2)return {kind:'art',id:w[1]||null,style};
  return {kind:'message',text:p,style};
}
// Text to tokens: uppercase, color tiles as {r}, everything else one character per tile
function tokens(str){
  const out=[], s=str.normalize('NFC').toUpperCase().replace(/[’‘]/g,"'").replace(/[“”]/g,'"').replace(/[–—]/g,'-').replace(/…/g,'...');
  for(let i=0;i<s.length;i++){
    const m=s.slice(i).match(/^\{([ROYGBVW])\}/);
    if(m){out.push('{'+m[1].toLowerCase()+'}');i+=2;continue}
    const ch=s[i];
    // Letters with an accent the board lacks fall back to the plain letter (È → E)
    const base=ch.normalize('NFD')[0];
    out.push(ch==='\n'?'\n':LETTERS.has(ch)?ch:LETTERS.has(base)?base:' ');
  }
  return out;
}
// Word wrap and center, like the board itself
function layout(str,cols){
  const lines=[]; let para=[];
  const flush=()=>{
    const words=[]; let w=[];
    for(const t of para){if(t===' '){if(w.length){words.push(w);w=[]}}else w.push(t)}
    if(w.length)words.push(w);
    if(!words.length){lines.push([]);return}
    let line=[];
    for(let word of words){
      while(word.length>cols){if(line.length){lines.push(line);line=[]}lines.push(word.slice(0,cols));word=word.slice(cols)}
      if(!word.length)continue;
      const need=line.length?line.length+1+word.length:word.length;
      if(need>cols){lines.push(line);line=[...word]}else line=line.length?[...line,' ',...word]:[...word];
    }
    if(line.length)lines.push(line);
  };
  for(const t of tokens(str)){if(t==='\n'){flush();para=[]}else para.push(t)}
  flush();
  while(lines.length&&!lines[lines.length-1].length)lines.pop();
  return lines;
}
function textCells(str,cols,rows){
  const lines=layout(str.replace(/\s*\/\s*/g,'\n'),cols).slice(0,rows);
  const cells=Array(cols*rows).fill(' '), top=Math.floor((rows-lines.length)/2);
  lines.forEach((ln,r)=>{const left=Math.floor((cols-ln.length)/2);ln.forEach((t,c)=>cells[(top+r)*cols+left+c]=t)});
  return cells;
}
// Art is drawn for the 22 x 6 board: shown 1:1 when it fits, otherwise squeezed to the widget's width
function artCells(rows22,cols,rows){
  const W=Math.max(...rows22.map(r=>r.length)), H=rows22.length, cells=Array(cols*rows).fill(' ');
  const scale=W>cols?cols/W:1, w=Math.round(W*scale), top=Math.max(0,Math.floor((rows-H)/2)), left=Math.floor((cols-w)/2);
  for(let r=0;r<Math.min(H,rows);r++)for(let c=0;c<w;c++){
    const row=rows22[r], pad=Math.floor((W-row.length)/2), src=row[Math.floor(c/scale)-pad]||'.';
    cells[(top+r)*cols+left+c]=src==='.'?' ':/[roygbvw]/.test(src)?'{'+src+'}':src;
  }
  return cells;
}
async function content(cfg,cols,rows){
  if(cfg.kind==='message')return textCells(cfg.text,cols,rows);
  if(cfg.kind==='clock'){
    const d=new Date(), h=d.getHours(), t=(h%12||12)+':'+String(d.getMinutes()).padStart(2,'0')+(h<12?' AM':' PM');
    const day=['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'][d.getDay()];
    const mon=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][d.getMonth()];
    return textCells(rows>=4?t+'\n\n'+day+'\n'+mon+' '+d.getDate():t+'\n'+day.slice(0,3)+' '+mon+' '+d.getDate(),cols,rows);
  }
  if(cfg.kind==='art'){
    const ids=Object.keys(ART), id=ART[cfg.id]?cfg.id:ids[Math.floor(Date.now()/864e5)%ids.length];
    return artCells(ART[id],cols,rows);
  }
  try{
    const data=await new Request(NEWS_URL).loadJSON();
    const sec=data.sections[cfg.section]||data.sections.top;
    const n=Math.floor(Date.now()/(20*60e3))%sec.items.length;
    const head=(sec.name==='Top stories'?'BBC NEWS':'BBC '+sec.name).toUpperCase();
    return textCells('{r} '+head+' {r}\n'+(rows>4?'\n':'')+sec.items[n],cols,rows);
  }catch(e){return textCells('{r} BBC NEWS {r}\nNO CONNECTION',cols,rows)}
}
function draw(cells,cols,rows,pal,W,H,pad,gap,tw,th){
  const ctx=new DrawContext(); ctx.size=new Size(W,H); ctx.opaque=true; ctx.respectScreenScale=true;
  ctx.setFillColor(hex(pal.frame)); ctx.fillRect(new Rect(0,0,W,H));
  const gw=cols*tw+(cols-1)*gap, gh=rows*th+(rows-1)*gap, x0=(W-gw)/2, y0=(H-gh)/2, r=Math.max(1.5,tw*.08);
  // Avenir Next Condensed ships with every iPhone. Its caps sit about 0.65 of the font size below the top of the text box,
  // so starting the box at 0.1 of the tile height centers them on the split
  const fs=th*.62, font=new Font('AvenirNextCondensed-DemiBold',fs);
  cells.forEach((t,i)=>{
    const x=x0+(i%cols)*(tw+gap), y=y0+Math.floor(i/cols)*(th+gap);
    const color=t.length===3?pal[t[1]]:pal.tile;
    const p=new Path(); p.addRoundedRect(new Rect(x,y,tw,th),r,r); ctx.addPath(p); ctx.setFillColor(hex(color)); ctx.fillPath();
    // A lighter top half, like the board's flaps
    ctx.setFillColor(new Color('#ffffff',t.length===3?.08:.04)); ctx.fillRect(new Rect(x,y,tw,th/2));
    if(t.length===1&&t!==' '){
      ctx.setFont(font); ctx.setTextColor(hex(pal.ink)); ctx.setTextAlignedCenter();
      ctx.drawTextInRect(t,new Rect(x,y+th/2-fs*.646,tw,th));
    }
    ctx.setFillColor(hex(pal.seam)); ctx.fillRect(new Rect(x,y+th/2-.5,tw,1));
  });
  return ctx.getImage();
}
async function build(family,param){
  const cfg=parse(param), pal=STYLES[cfg.style], [W,H]=SIZE[family]||SIZE.large, cols=(GRID[family]||GRID.large).cols;
  const pad=Math.round(W*.045), gap=Math.max(1.5,W*.006), tw=(W-2*pad-(cols-1)*gap)/cols, th=tw/.82;
  const rows=Math.max(1,Math.floor((H-2*pad+gap)/(th+gap)));
  const cells=await content(cfg,cols,rows);
  const w=new ListWidget();
  w.backgroundColor=hex(pal.frame); w.backgroundImage=draw(cells,cols,rows,pal,W,H,pad,gap,tw,th);
  w.url=BOARD_URL;
  w.refreshAfterDate=new Date(Date.now()+(cfg.kind==='clock'?60e3:15*60e3));
  return w;
}
const family=config.runsInWidget?config.widgetFamily:'large';
const widget=await build(family,args.widgetParameter);
if(config.runsInWidget)Script.setWidget(widget);
else await widget.presentLarge();
Script.complete();
