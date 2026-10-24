// Sound: flap mechanisms, room echo, the rush, chimes, backgrounds, and your own recording.
// Sound + speed settings
const SPEEDS={fast:70,normal:110,relaxed:170,slow:260,lazy:400};
const snd=Object.assign({on:false,vol:0.7,style:'auto',chime:'two',rate:1,pitch:1,speed:'normal',stereo:true,room:'room',ambient:'off',ambVol:0.4},store.get('fb.snd',{}));
if(snd.chime===true)snd.chime='two'; if(snd.chime===false)snd.chime='none';
if(!snd.realV1){if(snd.style==='clack')snd.style='real';snd.realV1=true}
if(!snd.autoV1){if(snd.style==='real')snd.style='auto';snd.autoV1=true}
snd.on=true; // Sound always starts on; the Sound button only mutes until the page is reopened.
const saveSnd=()=>store.set('fb.snd',snd);
function applySpeed(){TICK=SPEEDS[snd.speed]||110;document.documentElement.style.setProperty('--half',Math.round(TICK*0.45)+'ms')}
applySpeed();
let ac=null, master=null, noise=null, lastClick=0, clickCount=0, curDest=null, sampleBufs=[], sampleDoc=null;
function ensureAudio(){
  try{
    if(navigator.audioSession){try{navigator.audioSession.type='playback'}catch(e){}}
    if(!ac){
      ac=new (window.AudioContext||window.webkitAudioContext)();
      master=ac.createGain(); master.connect(ac.destination);
      noise=ac.createBuffer(1,Math.floor(ac.sampleRate*0.3),ac.sampleRate);
      const d=noise.getChannelData(0); for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
      buildRoom(); buildRush();
    }
    master.gain.value=snd.vol;
    if(ac.state!=='running')ac.resume();
    if(snd.on&&!amb&&snd.ambient!=='off')ambientStart();
  }catch(e){}
}
// Browsers only allow audio after a tap or key press, so unlock on any interaction.
let blockedBefore=false;
['pointerdown','keydown','touchend'].forEach(ev=>addEventListener(ev,()=>{blockedBefore=audioBlocked();if(snd.on){ensureAudio();setTimeout(checkAudio,150)}},{passive:true,capture:true}));
addEventListener('click',()=>{if(snd.on){ensureAudio();setTimeout(checkAudio,150)}},{passive:true,capture:true});
function audioBlocked(){return snd.on&&(!ac||ac.state!=='running')}
function renderSoundBtn(){const b=$('soundBtn'),bl=audioBlocked(),t=!snd.on?'Sound off':bl?'Tap for sound':'Sound on';b.querySelector('.lbl').textContent=t;b.setAttribute('aria-label',t);b.classList.toggle('on',snd.on&&!bl);b.classList.toggle('needs',bl);b.setAttribute('aria-pressed',String(snd.on))}
function checkAudio(){$('tapSound').hidden=!audioBlocked();renderSoundBtn()}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&ac&&snd.on){try{ac.resume()}catch(e){}setTimeout(checkAudio,300)}});
setInterval(checkAudio,2000);
function burst(t,o){
  const s=ac.createBufferSource(); s.buffer=noise;
  const f=ac.createBiquadFilter(); f.type=o.type; f.frequency.value=o.freq; f.Q.value=o.q||1;
  const g=ac.createGain(); g.gain.setValueAtTime(o.gain,t); g.gain.exponentialRampToValueAtTime(0.0001,t+o.dur);
  s.connect(f).connect(g).connect(curDest||master); if(roomIn)g.connect(roomIn); s.start(t,Math.random()*0.2,o.dur+0.02);
}
function tone(t,o){
  const osc=ac.createOscillator(); osc.type=o.wave||'sine';
  osc.frequency.setValueAtTime(o.freq,t); if(o.to)osc.frequency.exponentialRampToValueAtTime(o.to,t+o.dur);
  const g=ac.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(o.gain,t+(o.attack||0.002)); g.gain.exponentialRampToValueAtTime(0.0001,t+o.dur);
  osc.connect(g).connect(curDest||master); if(roomIn)g.connect(roomIn); osc.start(t); osc.stop(t+o.dur+0.03);
}
// Room echo: a short synthetic reverb that flaps and chimes share, so they sound like they're in a room, not inside the speaker
let roomIn=null, roomWet=null;
const ROOMS={off:null,room:{secs:.55,wet:.16,decay:3.2},hall:{secs:2.2,wet:.24,decay:2.4}};
function buildRoom(){
  const R=ROOMS[snd.room]; if(roomWet){try{roomWet.disconnect()}catch(e){}} roomIn=roomWet=null; if(!R||!ac)return;
  const len=Math.floor(ac.sampleRate*R.secs), ir=ac.createBuffer(2,len,ac.sampleRate);
  for(let c=0;c<2;c++){const d=ir.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,R.decay)}
  const cv=ac.createConvolver(); cv.buffer=ir; roomIn=ac.createGain(); roomWet=ac.createGain(); roomWet.gain.value=R.wet;
  const tone=ac.createBiquadFilter(); tone.type='lowpass'; tone.frequency.value=5200;
  roomIn.connect(tone).connect(cv).connect(roomWet).connect(master);
}
// The rush: a whole board flipping at once is a dense wash of flaps, not separate clicks. A filtered noise bed swells with
// the number of tiles moving each tick, under the individual clicks.
let rush=null;
function buildRush(){
  const len=ac.sampleRate*2, b=ac.createBuffer(1,len,ac.sampleRate), d=b.getChannelData(0); for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
  const src=ac.createBufferSource(); src.buffer=b; src.loop=true;
  const bp=ac.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=2600; bp.Q.value=.8;
  const g=ac.createGain(); g.gain.value=0;
  src.connect(bp).connect(g).connect(master); src.start();
  rush={bp,g};
}
function rushAt(n){
  if(!rush||!['auto','real','sample'].includes(snd.style))return;
  const M=mechNow(), t=ac.currentTime, hold=TICK/1000*1.3, lvl=Math.min(1,Math.max(0,(n-4)/50))*M.rushG;
  rush.bp.frequency.setTargetAtTime(M.rushF*snd.pitch,t,.05);
  rush.g.gain.cancelScheduledValues(t); rush.g.gain.setTargetAtTime(lvl,t,.02); rush.g.gain.setTargetAtTime(0,t+hold,.08);
}
const r=(a,b)=>a+Math.random()*(b-a);
const STYLES={
  clack:(t,k,p)=>{burst(t,{type:'bandpass',freq:r(1800,2700)*p,q:1.1,gain:1.2*k,dur:0.035});tone(t,{wave:'triangle',freq:150*p,to:75*p,gain:0.6*k,dur:0.04})},
  tick:(t,k,p)=>{burst(t,{type:'highpass',freq:4200*p,q:0.7,gain:1.0*k,dur:0.015})},
  soft:(t,k,p)=>{burst(t,{type:'lowpass',freq:1100*p,q:0.5,gain:1.3*k,dur:0.05});tone(t,{wave:'triangle',freq:110*p,to:55*p,gain:0.45*k,dur:0.05})},
  station:(t,k,p)=>{burst(t,{type:'lowpass',freq:700*p,q:0.8,gain:1.5*k,dur:0.07});tone(t,{wave:'triangle',freq:90*p,to:45*p,gain:0.8*k,dur:0.08});burst(t+0.012,{type:'bandpass',freq:2000*p,q:2,gain:0.5*k,dur:0.02})},
  wood:(t,k,p)=>{burst(t,{type:'bandpass',freq:r(850,1050)*p,q:3,gain:1.6*k,dur:0.03});tone(t,{wave:'sine',freq:r(420,480)*p,to:300*p,gain:0.5*k,dur:0.05})},
  typewriter:(t,k,p)=>{burst(t,{type:'highpass',freq:2500*p,q:0.8,gain:1.1*k,dur:0.02});burst(t+0.009,{type:'bandpass',freq:1200*p,q:4,gain:0.9*k,dur:0.018})},
  rattle:(t,k,p)=>{for(let i=0;i<3;i++)burst(t+i*0.012+r(0,0.006),{type:'bandpass',freq:r(2400,4000)*p,q:2,gain:0.9*k,dur:0.02})},
  paper:(t,k,p)=>{burst(t,{type:'bandpass',freq:r(2800,3400)*p,q:0.5,gain:0.9*k,dur:0.045})},
  rain:(t,k,p)=>{for(let i=0;i<4;i++)burst(t+r(0,0.05),{type:'highpass',freq:r(3000,6000)*p,q:0.6,gain:0.6*k,dur:0.008})},
  glass:(t,k,p)=>{tone(t,{freq:r(2300,2500)*p,gain:0.18*k,dur:0.09});tone(t,{freq:r(3500,3700)*p,gain:0.1*k,dur:0.06});burst(t,{type:'highpass',freq:5000,q:0.7,gain:0.3*k,dur:0.008})},
  marble:(t,k,p)=>{tone(t,{freq:r(1300,1700)*p,to:r(900,1100)*p,gain:0.25*k,dur:0.05});burst(t,{type:'bandpass',freq:3000*p,q:3,gain:0.4*k,dur:0.01})},
  blip:(t,k,p)=>{tone(t,{wave:'square',freq:660*p,to:440*p,gain:0.12*k,dur:0.04})},
  // Modelled from a real flap: plastic snap on the stop, a short ring, the case thump, then a tiny settling bounce
  real:(t,k,p)=>mechFlap(t,k,p,MECH.flap),
  // Each board style gets the mechanism it would really have: a heavy station board, a little clock, card, wood, tile, a bus roll-sign
  auto:(t,k,p)=>mechFlap(t,k,p,mechNow()),
  sample:(t,k,p)=>{
    if(!sampleBufs.length)return STYLES.real(t,k,p);
    const s=ac.createBufferSource(); s.buffer=sampleBufs[Math.random()*sampleBufs.length|0]; s.playbackRate.value=p*r(.97,1.03);
    const g=ac.createGain(); g.gain.value=Math.min(1.4,k*1.6); s.connect(g).connect(curDest||master); s.start(t);
  }
};
// Mechanisms. snap: the flap hitting its stop; ring: what the flap itself rings at; body: the case thump; knock: a woody or
// stony resonance; bounce: the small second tap as it settles; flutter: several quick ticks (a roll-sign or card rack);
// rushF/rushG: the color and level of the whole-board wash.
const MECH={
  flap:{snap:3300,snapQ:1.6,snapG:1.5,snapD:.009,air:.55,ring:[[2150,.1,.03],[3420,.06,.022]],body:260,bodyG:.9,bodyD:.035,bounce:.45,bounceF:2800,rushF:2600,rushG:.14},
  heavy:{snap:2400,snapQ:1.3,snapG:1.7,snapD:.013,air:.4,ring:[[1550,.12,.05],[2700,.07,.04]],body:170,bodyG:1.3,bodyD:.06,knock:120,knockG:.35,bounce:.5,bounceF:2200,rushF:1800,rushG:.2},
  clock:{snap:4600,snapQ:2,snapG:1,snapD:.006,air:.3,ring:[[3900,.05,.015]],body:420,bodyG:.3,bodyD:.02,bounce:.3,bounceF:4200,rushF:4200,rushG:.06},
  card:{snap:2900,snapQ:.6,snapG:1.1,snapD:.028,air:.5,ring:[],body:520,bodyG:.4,bodyD:.03,bounce:.25,bounceF:3200,rushF:3000,rushG:.13},
  wood:{snap:1000,snapQ:3,snapG:1.4,snapD:.03,air:.2,ring:[],body:300,bodyG:.6,bodyD:.04,knock:460,knockG:.5,bounce:.2,bounceF:950,rushF:1200,rushG:.12},
  ceramic:{snap:3600,snapQ:2.5,snapG:1,snapD:.006,air:.35,ring:[[2850,.14,.09],[4150,.08,.07]],body:350,bodyG:.4,bodyD:.025,bounce:.4,bounceF:3800,rushF:3400,rushG:.1},
  tin:{snap:3000,snapQ:1.8,snapG:1.2,snapD:.008,air:.45,ring:[[1900,.12,.08],[3100,.08,.06],[4700,.05,.05]],body:220,bodyG:.7,bodyD:.03,bounce:.4,bounceF:3000,rushF:2400,rushG:.14},
  stone:{snap:1800,snapQ:1,snapG:1.5,snapD:.012,air:.3,ring:[],body:140,bodyG:1.2,bodyD:.05,knock:190,knockG:.3,bounce:.3,bounceF:1600,rushF:1400,rushG:.17},
  soft:{snap:1400,snapQ:.7,snapG:1.2,snapD:.03,air:.15,ring:[],body:200,bodyG:.8,bodyD:.045,bounce:.15,bounceF:1200,rushF:1100,rushG:.1},
  roll:{snap:2200,snapQ:1.2,snapG:.9,snapD:.008,air:.3,ring:[],body:200,bodyG:.5,bodyD:.03,flutter:3,bounce:0,bounceF:0,rushF:700,rushG:.22},
  pixel:{pixel:true,rushF:5000,rushG:.03}
};
const STYLE_MECH={glow:'pixel',neon:'pixel',
  solari:'heavy',patapata:'heavy',standard:'heavy',doublearrow:'heavy',oxblood:'heavy',metro:'heavy',
  cifra:'clock',sbb:'clock',
  graphite:'card',kassak:'card',mexico68:'card',guayasamin:'card',
  butterfly:'wood',werkstatte:'wood',
  marinedrive:'ceramic',ekimei:'ceramic',iznik:'ceramic',william:'ceramic',tiffany:'ceramic',googie:'ceramic',
  jetage:'tin',buttoncopy:'tin',stahl:'tin',
  calcadao:'stone',barragan:'stone',
  bojagi:'soft',hakka:'soft',amish:'soft',geesbend:'soft',logcabin:'soft',starbethlehem:'soft',baltimore:'soft',hawaiian:'soft',crazyquilt:'soft',matyo:'soft',splash:'soft',ikarus:'roll'};
const mechNow=()=>{const b=$('board');return MECH[STYLE_MECH[b&&b.dataset.style]]||MECH.flap};
function mechFlap(t,k,p,M){
  if(M.pixel){tone(t,{wave:'square',freq:r(840,920)*p,to:640*p,gain:.06*k,dur:.025});return}
  const v=r(.93,1.07), n=M.flutter||1;
  for(let i=0;i<n;i++){
    const ti=t+i*r(.007,.011), ki=k*(i?.6:1);
    burst(ti,{type:'bandpass',freq:M.snap*p*v*r(.97,1.03),q:M.snapQ,gain:M.snapG*ki,dur:M.snapD});
    if(M.air)burst(ti,{type:'highpass',freq:6000*p,q:.7,gain:M.air*ki,dur:.004});
  }
  M.ring.forEach(([f,g,d])=>tone(t,{freq:f*p*v,gain:g*k,dur:d,attack:.0008}));
  burst(t,{type:'lowpass',freq:M.body*p,q:.7,gain:M.bodyG*k,dur:M.bodyD});
  if(M.knock)tone(t,{wave:'sine',freq:M.knock*p*v,to:M.knock*.7*p,gain:M.knockG*k,dur:.06});
  if(M.bounce)burst(t+r(.007,.013),{type:'bandpass',freq:M.bounceF*p*v,q:2,gain:M.bounce*k,dur:.006});
}
const CHIMES={
  two:[[880,0,0.9],[1318.5,0.12,0.9]],
  airport:[[698.5,0,1.2],[880,0.35,1.2],[1046.5,0.7,1.6]],
  bell:'bell',
  marimba:[[523.3,0,0.4],[659.3,0.09,0.4],[784,0.18,0.4],[1046.5,0.27,0.7]],
  arcade:[[523.3,0,0.12],[784,0.08,0.12],[1046.5,0.16,0.25]]
};
// Warmer chimes, built from struck-bar and tube partials. Melodies are our own.
const BELLS={
  arrival:{notes:[[784,0],[1046.5,.42],[1318.5,.84]],partials:[[1,1,1],[2.76,.42,.55],[5.4,.2,.32],[8.93,.08,.2]],dur:2.6,gain:.22},
  vibes:{notes:[[659.3,0],[830.6,.15],[987.8,.3],[1318.5,.45]],partials:[[1,1,1],[4,.22,.35],[10,.05,.12]],dur:2.2,gain:.2,trem:5.5},
  departure:{notes:[[1046.5,0],[1318.5,.4],[880,.8],[1174.7,1.2]],partials:[[1,1,1],[2.76,.38,.5],[5.4,.16,.3]],dur:2.4,gain:.2},
  tubular:{notes:[[392,0]],partials:[[1,1,1],[2.76,.5,.7],[5.4,.3,.45],[8.93,.16,.3],[13.34,.06,.2]],dur:4.5,gain:.26},
  kalimba:{notes:[[1046.5,0],[1318.5,.11],[1568,.22],[2093,.4]],partials:[[1,1,1],[5.95,.18,.12]],dur:.9,gain:.24},
  celesta:{notes:[[1568,0],[1975.5,.12],[2349.3,.24]],partials:[[1,1,1],[2,.3,.4],[3,.08,.2]],dur:1.3,gain:.16}
};
function bellNote(t,f,B){
  B.partials.forEach(([m,g,dm])=>{
    const o=ac.createOscillator(); o.frequency.value=f*m*r(.998,1.002);
    const e=ac.createGain(), d=B.dur*dm; e.gain.setValueAtTime(.0001,t); e.gain.exponentialRampToValueAtTime(B.gain*g,t+.004); e.gain.exponentialRampToValueAtTime(.0001,t+d);
    let out=e;
    if(B.trem&&m===1){const tr=ac.createGain(),lfo=ac.createOscillator(),dep=ac.createGain();tr.gain.value=.75;lfo.frequency.value=B.trem;dep.gain.value=.25;lfo.connect(dep).connect(tr.gain);lfo.start(t);lfo.stop(t+d+.05);e.connect(tr);out=tr}
    o.connect(e); out.connect(master); if(roomIn)out.connect(roomIn); o.start(t); o.stop(t+d+.05);
  });
}
function playClick(n,pan,when){
  try{
    curDest=null;
    if(snd.stereo&&pan!=null&&ac.createStereoPanner){curDest=ac.createStereoPanner();curDest.pan.value=pan;curDest.connect(master)}
    (STYLES[snd.style]||STYLES.real)(when||ac.currentTime+0.005,Math.min(1,0.45+Math.log2(1+n)*0.09),snd.pitch);
  }catch(e){}finally{curDest=null}
}
// Many flaps land a few milliseconds apart: spread each tick into a short cascade, panned by column
function click(n,cols){
  if(!snd.on||!ac||ac.state!=='running')return;
  clickCount++; if(clickCount%snd.rate)return;
  const now=performance.now(); if(now-lastClick<25)return; lastClick=now;
  rushAt(n);
  const hits=snd.rate>2?1:Math.min(n,snd.rate===2?3:5), span=TICK/1000*0.8, t0=ac.currentTime+0.005;
  for(let i=0;i<hits;i++){
    const c=cols&&cols.length?cols[Math.random()*cols.length|0]:(COLS-1)/2;
    playClick(Math.max(1,n/hits),(c/(COLS-1))*1.6-0.8,t0+(i/hits)*span+r(0,span/hits*0.6));
  }
}
function playChime(){
  try{
    const t=ac.currentTime+0.02, B=BELLS[snd.chime]; if(B){B.notes.forEach(([f,d])=>bellNote(t+d,f,B));return}
    const c=CHIMES[snd.chime]; if(!c)return;
    if(c==='bell'){[[1,0.3],[2,0.12],[2.76,0.08],[5.4,0.04]].forEach(([m,gn])=>tone(t,{freq:660*m,gain:gn,dur:2.2,attack:0.004}));return}
    c.forEach(([f,d,len])=>tone(t+d,{wave:snd.chime==='arcade'?'square':snd.chime==='marimba'?'triangle':'sine',freq:f,gain:snd.chime==='arcade'?0.1:0.3,dur:len,attack:0.008}));
  }catch(e){}
}
// Ambient: a quiet background under the flaps, generated here rather than downloaded. Each one is a few layers of
// shaped noise, with small sounds (rain drops, footsteps, cups, a far-off station chime) scattered at random.
let amb=null;
function noiseBuf(kind,secs){
  const len=Math.floor(ac.sampleRate*secs), b=ac.createBuffer(2,len,ac.sampleRate);
  for(let c=0;c<2;c++){const d=b.getChannelData(c);let last=0,b0=0,b1=0,b2=0;
    for(let i=0;i<len;i++){const w=Math.random()*2-1;
      if(kind==='brown'){last=(last+.02*w)/1.02;d[i]=last*3.5}
      else{b0=.99765*b0+w*.099;b1=.963*b1+w*.2965;b2=.57*b2+w*1.0526;d[i]=(b0+b1+b2+w*.1848)*.2}}}
  return b;
}
function ambientStart(){
  ambientStop(); if(!ac||!snd.on||snd.ambient==='off')return;
  const out=ac.createGain(), t0=ac.currentTime, A={out,srcs:[],timers:[]}; out.gain.value=.0001; out.connect(master);
  out.gain.setTargetAtTime(snd.ambVol*.6,t0,1.2);
  const bed=(kind,type,freq,q,gain,lfo)=>{
    const s=ac.createBufferSource(); s.buffer=noiseBuf(kind,6); s.loop=true;
    const f=ac.createBiquadFilter(); f.type=type; f.frequency.value=freq; f.Q.value=q;
    const g=ac.createGain(); g.gain.value=gain; s.connect(f).connect(g).connect(out); s.start(); A.srcs.push(s);
    if(lfo){const o=ac.createOscillator(),d=ac.createGain();o.frequency.value=lfo[0];d.gain.value=gain*lfo[1];o.connect(d).connect(g.gain);o.start();A.srcs.push(o)}
  };
  const every=(lo,hi,fn)=>{const go=()=>{try{fn(ac.currentTime+.02)}catch(e){}A.timers.push(setTimeout(go,r(lo,hi)))};A.timers.push(setTimeout(go,r(lo,hi)))};
  const sub=(fn)=>{const keep=curDest;curDest=out;try{fn()}finally{curDest=keep}};
  const k=snd.ambient;
  if(k==='hall'){
    bed('brown','lowpass',260,.7,.9);                       // the hall's low rumble
    bed('pink','bandpass',520,.9,.22,[.21,.5]);             // a crowd's murmur, rising and falling
    bed('pink','bandpass',1300,1.2,.06,[.13,.7]);
    every(380,900,t=>sub(()=>burst(t,{type:'lowpass',freq:r(380,520),q:.8,gain:r(.05,.12),dur:.06})));            // footsteps
    every(70e3,160e3,t=>sub(()=>{[[659.3,0],[523.3,.5]].forEach(([f,d])=>tone(t+d,{freq:f,gain:.035,dur:1.6,attack:.01}))})); // a far-off station chime
  }else if(k==='rain'){
    bed('pink','highpass',1400,.5,.42);
    bed('brown','lowpass',180,.7,.5);
    every(25,110,t=>sub(()=>burst(t,{type:'highpass',freq:r(3500,7000),q:.7,gain:r(.02,.09),dur:.006})));
  }else if(k==='cafe'){
    bed('brown','lowpass',200,.7,.45);
    bed('pink','bandpass',600,.8,.25,[.17,.6]);
    bed('pink','bandpass',1500,1,.08,[.29,.6]);
    every(1800,6500,t=>sub(()=>{const f=r(2400,3600);tone(t,{freq:f,gain:.022,dur:.28,attack:.001});tone(t,{freq:f*2.7,gain:.008,dur:.15,attack:.001})}));
  }else if(k==='room'){
    bed('brown','lowpass',120,.7,.6);
    bed('pink','highpass',6000,.5,.025);
  }
  amb=A;
}
function ambientStop(){
  if(!amb)return; const A=amb; amb=null; A.timers.forEach(clearTimeout);
  try{A.out.gain.cancelScheduledValues(ac.currentTime);A.out.gain.setTargetAtTime(.0001,ac.currentTime,.3)}catch(e){}
  setTimeout(()=>{A.srcs.forEach(s=>{try{s.stop()}catch(e){}});try{A.out.disconnect()}catch(e){}},1500);
}
function landed(){if(snd.on&&snd.chime!=='none'&&ac&&ac.state==='running')playChime()}
function renderSound(){
  $('sndToggle').textContent=snd.on?'Sound on':'Sound off'; $('sndToggle').classList.toggle('on',snd.on); renderSoundBtn();
  $('vol').value=snd.vol; $('volOut').textContent=Math.round(snd.vol*100)+'%';
  $('pitch').value=snd.pitch; $('pitchOut').textContent=snd.pitch<0.95?'Lower':snd.pitch>1.05?'Higher':'Normal';
  $('sndStyle').value=snd.style; $('sndStereo').checked=!!snd.stereo; $('chimeStyle').value=snd.chime; $('sndRate').value=snd.rate; $('speed').value=snd.speed;
  $('sndRoom').value=snd.room; $('sndAmb').value=snd.ambient; $('ambVol').value=snd.ambVol; $('ambVolOut').textContent=Math.round(snd.ambVol*100)+'%'; $('ambVolField').hidden=snd.ambient==='off';
}
const preview=(count,gap)=>{ensureAudio();setTimeout(()=>{for(let i=0;i<count;i++)setTimeout(()=>playClick(8),i*(gap||TICK))},60)};
function toggleSound(){if(blockedBefore||audioBlocked()){blockedBefore=false;ensureAudio();setTimeout(checkAudio,200);return}snd.on=!snd.on;saveSnd();renderSound();if(snd.on){preview(1);ambientStart()}else ambientStop();checkAudio()}
$('soundBtn').onclick=toggleSound; $('sndToggle').onclick=toggleSound;
$('vol').oninput=()=>{snd.vol=+$('vol').value;saveSnd();renderSound();if(master)master.gain.value=snd.vol};
$('vol').onchange=()=>preview(1);
$('pitch').oninput=()=>{snd.pitch=+$('pitch').value;saveSnd();renderSound()};
$('pitch').onchange=()=>preview(3);
$('sndStyle').onchange=()=>{snd.style=$('sndStyle').value;saveSnd();preview(5)};
$('sndRate').onchange=()=>{snd.rate=+$('sndRate').value;saveSnd();preview(5,TICK*snd.rate)};
$('chimeStyle').onchange=()=>{snd.chime=$('chimeStyle').value;saveSnd();ensureAudio();setTimeout(playChime,60)};
$('speed').onchange=()=>{snd.speed=$('speed').value;saveSnd();applySpeed()};
$('sndRoom').onchange=()=>{snd.room=$('sndRoom').value;saveSnd();ensureAudio();buildRoom();preview(4)};
$('sndAmb').onchange=()=>{snd.ambient=$('sndAmb').value;saveSnd();renderSound();ensureAudio();ambientStart()};
$('ambVol').oninput=()=>{snd.ambVol=+$('ambVol').value;saveSnd();renderSound();if(amb&&ac)amb.out.gain.setTargetAtTime(snd.ambVol*.6,ac.currentTime,.2)};
['pattern','motion','finish','frame','restyle','perf'].forEach(k=>{$('anim-'+k).onchange=()=>{anim[k]=$('anim-'+k).value;if(k==='perf'){perfSlow=false;store.set('fb.perfSlow',false)}applyAnim();if(k==='pattern'||k==='motion')replay()}});
['boot','idle'].forEach(k=>{$('anim-'+k).onchange=()=>{anim[k]=$('anim-'+k).checked;applyAnim()}});
applyAnim();
$('testBtn').onclick=()=>{ensureAudio();setTimeout(()=>{const n=8;for(let i=0;i<n;i++)setTimeout(()=>playClick(10),i*TICK*snd.rate);setTimeout(playChime,n*TICK*snd.rate+200)},60)};
renderSound(); checkAudio();
$('sndStereo').onchange=()=>{snd.stereo=$('sndStereo').checked;saveSnd();preview(5)};

// Your own recording: find the clacks, keep them as short 16-bit slices in the board's database
function b64FromBytes(u8){let s='';for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s)}
function bytesFromB64(b){const s=atob(b),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u}
async function analyseRecording(file){
  ensureAudio(); if(!ac)throw {code:'noaudio'};
  const raw=await ac.decodeAudioData(await file.arrayBuffer());
  const RATE=22050, dur=Math.min(raw.duration,60);
  const off=new OfflineAudioContext(1,Math.max(1,Math.ceil(dur*RATE)),RATE);
  const src=off.createBufferSource(); src.buffer=raw; src.connect(off.destination); src.start(0,0,dur);
  const mono=(await off.startRendering()).getChannelData(0);
  const W=Math.round(RATE*0.005), env=[];
  for(let i=0;i<mono.length;i+=W){let q=0,e=Math.min(i+W,mono.length);for(let j=i;j<e;j++)q+=mono[j]*mono[j];env.push(Math.sqrt(q/W))}
  const sorted=[...env].sort((a,b)=>a-b), med=sorted[sorted.length>>1]||0, peak=sorted[sorted.length-1]||0;
  if(peak<0.003)return null;
  const th=Math.max(peak*0.18,med*4); let onsets=[], lastOn=-1e9;
  for(let i=1;i<env.length;i++){if(env[i]>=th&&env[i-1]<th&&i-lastOn>=8){onsets.push(i*W);lastOn=i}}
  if(!onsets.length)onsets=[env.indexOf(peak)*W];
  if(onsets.length>16){const st=onsets.length/16;onsets=Array.from({length:16},(_,k)=>onsets[Math.floor(k*st)])}
  const LEN=Math.round(RATE*0.11), PRE=Math.round(RATE*0.002), FADE=Math.round(RATE*0.025);
  const slices=onsets.map(o=>{
    const a=Math.max(0,o-PRE), sl=mono.slice(a,a+LEN); let m=0; for(const v of sl)m=Math.max(m,Math.abs(v));
    const g=m?0.9/m:1, out=new Int16Array(sl.length);
    for(let i=0;i<sl.length;i++){let v=sl[i]*g;if(i>sl.length-FADE)v*=(sl.length-i)/FADE;out[i]=Math.max(-32767,Math.min(32767,Math.round(v*32767)))}
    return out;
  });
  const total=slices.reduce((n,a)=>n+a.length,0), all=new Int16Array(total); let o=0;
  const lens=slices.map(a=>{all.set(a,o);o+=a.length;return a.length});
  return {rate:RATE,lens,pcm:b64FromBytes(new Uint8Array(all.buffer)),name:String(file.name||'Recording').slice(0,80),clacks:slices.length,updatedAt:new Date().toISOString()};
}
function buildSampleBufs(doc){
  sampleBufs=[];
  try{
    if(!doc||!doc.pcm||!Array.isArray(doc.lens))return;
    const u8=bytesFromB64(String(doc.pcm)), pcm=new Int16Array(u8.buffer,0,u8.byteLength>>1); let o=0;
    for(const len of doc.lens){
      const n=Math.max(1,Math.min(len|0,pcm.length-o)); if(n<=1)break;
      const b=new AudioBuffer({length:n,sampleRate:+doc.rate||22050,numberOfChannels:1}), ch=b.getChannelData(0);
      for(let i=0;i<n;i++)ch[i]=pcm[o+i]/32767; o+=n; sampleBufs.push(b);
    }
  }catch(e){sampleBufs=[]}
}
function renderSample(note){
  $('optSample').disabled=!sampleBufs.length; $('sampleClear').hidden=!sampleDoc&&!sampleBufs.length;
  $('sampleBtn').textContent=sampleBufs.length?'Replace recording':'Upload a recording';
  if(note){$('sampleStatus').textContent=note;return}
  if(sampleDoc&&sampleBufs.length)$('sampleStatus').textContent='Using '+sampleBufs.length+' clacks from “'+(sampleDoc.name||'your recording')+'”. Choose “Your recording” under Flap sound to hear it.';
  if(snd.style==='sample'&&!sampleBufs.length){snd.style='real';saveSnd();renderSound()}
}
let sampleRef=null;
(async()=>{
  const db=await useCap('db'); if(!db)return;
  sampleRef=db.doc('sound/sample');
  sampleRef.onSnapshot(snap=>{sampleDoc=snap.exists?snap.data():null;buildSampleBufs(sampleDoc);renderSample()},()=>{});
})();
$('sampleBtn').onclick=()=>$('sampleFile').click();
$('sampleFile').onchange=async()=>{
  const file=$('sampleFile').files&&$('sampleFile').files[0]; $('sampleFile').value=''; if(!file)return;
  renderSample('Listening for clacks in “'+file.name+'”…');
  let doc;
  try{doc=await analyseRecording(file)}catch(e){renderSample('Couldn’t read that file. Try an MP3, WAV or M4A recording.');return}
  if(!doc){renderSample('That recording is too quiet. Try one with the flaps closer to the microphone.');return}
  sampleDoc=doc; buildSampleBufs(doc); snd.style='sample'; saveSnd(); renderSound(); preview(6);
  if(!sampleRef){renderSample('Found '+doc.clacks+' clacks. They’ll play on this screen until you reload; open the board in Claude to save them for every screen.');return}
  try{await sampleRef.set(doc);renderSample('Found '+doc.clacks+' clacks in “'+doc.name+'”. Saved, so every screen showing this board uses them.')}
  catch(e){renderSample('Found '+doc.clacks+' clacks. They play on this screen, but couldn’t be saved for other screens: only the board’s owner can save a recording.')}
};
$('sampleClear').onclick=async()=>{
  const prev=sampleDoc; sampleDoc=null; sampleBufs=[]; if(snd.style==='sample'){snd.style='real';saveSnd();renderSound()}
  renderSample('Recording removed. The board is back to the modelled flap sound.');
  if(sampleRef){try{await sampleRef.delete()}catch(e){}}
  toast('Recording removed',prev?async()=>{sampleDoc=prev;buildSampleBufs(prev);renderSample();if(sampleRef){try{await sampleRef.set(prev)}catch(e){}}}:null);
};
renderSample();

