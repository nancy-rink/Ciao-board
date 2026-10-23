// Book: a public-domain novel read over the day. Each day takes the next chapter (very short ones share a day with the next),
// and its pages turn evenly from the start of the reading hours to the end, so every board shows the same page at the same time.
// Each book keeps its own place: switching to another book pauses this one, and switching back picks up where it was.
const BOOKS=[
  {id:'moby',title:'Moby-Dick',author:'Herman Melville',file:'books/moby-dick.json'},
  {id:'pride',title:'Pride and Prejudice',author:'Jane Austen',file:'books/pride-and-prejudice.json'},
  {id:'frank',title:'Frankenstein',author:'Mary Shelley',file:'books/frankenstein.json'}
];
const BOOK_BY=Object.fromEntries(BOOKS.map(b=>[b.id,b]));
const book=Object.assign({which:'moby',from:'08:00',to:'22:00',prog:{}},store.get('fb.book',{}));
// Boards from before there were several books kept one place for Moby-Dick
if('start' in book){book.prog.moby={start:book.start,first:book.first||0};delete book.start;delete book.first}
if(!BOOK_BY[book.which])book.which='moby';
const saveBook=()=>store.set('fb.book',book);
const BOOK_DAY_CHARS=5000;
const bookCache={};
let bookData=null, bookDays=null, bookShown='', bookPagesFor=null, bookPages=[];
const dayKey=d=>d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
const minsOf=t=>{const [h,m]=t.split(':').map(Number);return h*60+m};
const bookInfo=()=>BOOK_BY[book.which];
const bookProg=id=>book.prog[id]||(book.prog[id]={start:'',first:0});
function daysSince(start){if(!start)return 0;const [y,m,d]=start.split('-').map(Number),t=new Date();return Math.max(0,Math.round((new Date(t.getFullYear(),t.getMonth(),t.getDate())-new Date(y,m-1,d))/864e5))}
function bookLoad(){
  const id=book.which, b=BOOK_BY[id];
  if(!bookCache[id])bookCache[id]=fetch(b.file).then(r=>{if(!r.ok)throw new Error(r.status);return r.json()}).then(d=>{
    const days=[]; let cur=[], n=0;
    d.chapters.forEach((c,i)=>{cur.push(i);n+=c.text.reduce((a,p)=>a+p.length+20,0);if(n>=BOOK_DAY_CHARS){days.push(cur);cur=[];n=0}});
    if(cur.length)days.push(cur);
    return {data:d,days};
  }).catch(e=>{delete bookCache[id];throw e});
  return bookCache[id].then(r=>{if(book.which===id){if(bookData!==r.data)bookPagesFor=null;bookData=r.data;bookDays=r.days}return r});
}
// Which day of the book today is: a book starts on the day you first read it, and pauses while another book is on
function bookToday(){
  const p=bookProg(book.which); if(!p.start){p.start=dayKey(new Date());saveBook()}
  return (p.first+daysSince(p.start))%bookDays.length;
}
function setBook(id){
  if(!BOOK_BY[id]||id===book.which)return;
  const p=bookProg(book.which); p.first+=daysSince(p.start); p.start='';
  book.which=id; saveBook(); bookData=null; bookDays=null; bookPagesFor=null; bookShown=''; $('bookWhich').value=id;
}
const dayName=i=>{const cs=bookDays[i].map(j=>bookData.chapters[j]);return cs.length>1?cs[0].label+' to '+cs[cs.length-1].label:cs[0].label};
const chTitle=c=>c.title||'';
// A day's pages: a title page for each chapter, then its text set flush left, six lines to a page, each paragraph on a new line
function bookBuild(i){
  if(bookPagesFor===i)return bookPages;
  const pages=[];
  bookDays[i].forEach(j=>{
    const c=bookData.chapters[j];
    pages.push({text:'{v} '+c.label.toUpperCase()+' {v}\n\n'+(chTitle(c)||bookInfo().title).toUpperCase(),ch:c});
    const lines=[]; c.text.forEach(p=>lines.push(...layout(p)));
    for(let k=0;k<lines.length;k+=ROWS){
      const cells=new Array(COLS*ROWS).fill(0);
      lines.slice(k,k+ROWS).forEach((ln,r)=>ln.forEach((t,col)=>{cells[r*COLS+col]=IDX.get(t)??0}));
      pages.push({cells,ch:c});
    }
  });
  bookPagesFor=i; bookPages=pages; return pages;
}
const fmtMins=m=>fmtSlotTime(pad2(Math.floor(m/60)%24)+':'+pad2(m%60));
// What the board shows now: before the reading hours a note of what's coming, during them the page for this moment, after them tomorrow's chapter
function bookNow(){
  const i=bookToday(), pages=bookBuild(i), d=new Date(), now=d.getHours()*60+d.getMinutes()+d.getSeconds()/60;
  const from=minsOf(book.from), to=Math.max(from+30,minsOf(book.to)), T=bookInfo().title.toUpperCase();
  const first=bookData.chapters[bookDays[i][0]], line=c=>c.label.toUpperCase()+(c.title?'\n'+c.title.toUpperCase():'');
  if(now<from)return {key:i+':before',text:T+'\n\n'+line(first)+'\nFROM '+fmtMins(from).toUpperCase(),status:bookInfo().title+' · today: '+dayName(i)+', from '+fmtMins(from)+'.'};
  if(now>=to){const n=(i+1)%bookDays.length, c=bookData.chapters[bookDays[n][0]];
    return {key:i+':after',text:T+'\n\nTOMORROW, '+line(c),status:bookInfo().title+' · today’s reading is done. Tomorrow: '+dayName(n)+', from '+fmtMins(from)+'.'}}
  const k=Math.min(pages.length-1,Math.floor((now-from)/(to-from)*pages.length)), p=pages[k], every=(to-from)/pages.length;
  return {key:i+':'+k,text:p.text,cells:p.cells,
    status:bookInfo().title+' · '+p.ch.label+(p.ch.title?', '+p.ch.title:'')+' · page '+(k+1)+' of '+pages.length+' · a new page '+(every>=1.5?'about every '+Math.round(every)+' minutes':'every minute or so')+'.'};
}
function bookSetStatus(t){$('bookStatus').textContent=t}
function bookCells(){
  if(!bookData){bookLoad().then(()=>{try{renderChannels()}catch(e){}}).catch(()=>{});const b=bookInfo();return toTargets(b.title+'\n\n'+b.author).cells}
  const b=bookNow(); return b.cells||toTargets(b.text).cells;
}
function bookShow(force){
  if(mode!=='book'||!bookData)return;
  const b=bookNow(); bookSetStatus(b.status);
  if(!force&&b.key===bookShown)return; bookShown=b.key;
  send(b.cells?'':b.text,Object.assign({label:'Book: '+bookInfo().title},b.cells?{cells:b.cells}:{}));
}
async function startBook(){
  stopModes(); mode='book'; store.set('fb.mode','book'); $('bookBtn').classList.add('on'); setStatus(busy?'Flipping':'Showing');
  bookShown='';
  const which=book.which;
  try{await bookLoad()}catch(e){if(mode==='book'){bookSetStatus('Couldn’t load the book. Check the internet connection; the board will try again.');send(bookInfo().title.toUpperCase()+'\n\nCOULDN\'T LOAD\nTHE BOOK')}timer=setInterval(()=>{bookLoad().then(()=>{bookFillDays();bookShow(true)}).catch(()=>{})},60000);return}
  if(mode!=='book'||book.which!==which)return;
  bookFillDays(); bookShow(true);
  timer=setInterval(()=>bookShow(false),15000);
}
$('bookBtn').onclick=()=>{if(mode==='book')stopModes();else startBook()};
// Settings: which book, the reading hours, and which day of the book to read today
$('bookWhich').innerHTML=BOOKS.map(b=>'<option value="'+b.id+'">'+b.title+' · '+b.author+'</option>').join(''); $('bookWhich').value=book.which;
$('bookWhich').onchange=()=>{setBook($('bookWhich').value);$('bookDay').innerHTML='<option>Loading…</option>';if(mode==='book')startBook();else bookLoad().then(()=>{bookFillDays();try{renderChannels()}catch(e){}}).catch(()=>{})};
function bookFillDays(){
  const sel=$('bookDay'); if(!bookDays)return;
  if(sel.dataset.book!==book.which||sel.options.length!==bookDays.length){
    sel.innerHTML=''; sel.dataset.book=book.which;
    bookDays.forEach((ids,i)=>{const o=document.createElement('option');o.value=String(i);const c=bookData.chapters[ids[0]];o.textContent='Day '+(i+1)+' · '+dayName(i)+(c.title?': '+c.title:'');sel.appendChild(o)});
  }
  sel.value=String(bookToday());
}
$('bookFrom').value=book.from; $('bookTo').value=book.to;
['bookFrom','bookTo'].forEach(id=>{$(id).onchange=()=>{
  const v=$(id).value; if(!/^\d\d:\d\d$/.test(v))return; book[id==='bookFrom'?'from':'to']=v;
  if(minsOf(book.to)<=minsOf(book.from)){book.to=book.from===book.to?'22:00':book.to;$('bookTo').value=book.to}
  saveBook(); if(mode==='book')bookShow(true); else try{renderChannels()}catch(e){}
}});
$('bookDay').onchange=()=>{const p=bookProg(book.which);p.start=dayKey(new Date());p.first=+$('bookDay').value;saveBook();bookPagesFor=null;if(mode==='book')bookShow(true);else try{renderChannels()}catch(e){}};
bookLoad().then(bookFillDays).catch(()=>{});
