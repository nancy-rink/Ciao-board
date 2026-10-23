// Book: Moby-Dick, read over the day. Each day takes the next chapter (very short ones share a day with the next), and
// its pages turn evenly from the start of the reading hours to the end, so every board shows the same page at the same time.
const book=Object.assign({from:'08:00',to:'22:00',start:'',first:0},store.get('fb.book',{}));
const saveBook=()=>store.set('fb.book',book);
const BOOK_URL='books/moby-dick.json', BOOK_DAY_CHARS=5000;
let bookData=null, bookDays=null, bookLoading=null, bookShown='', bookPagesFor=null, bookPages=[];
const dayKey=d=>d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
const minsOf=t=>{const [h,m]=t.split(':').map(Number);return h*60+m};
function bookLoad(){
  if(bookData)return Promise.resolve(bookData);
  if(!bookLoading)bookLoading=fetch(BOOK_URL).then(r=>{if(!r.ok)throw new Error(r.status);return r.json()}).then(d=>{
    bookData=d; bookDays=[]; let cur=[], n=0;
    d.chapters.forEach((c,i)=>{cur.push(i);n+=c.text.reduce((a,p)=>a+p.length+20,0);if(n>=BOOK_DAY_CHARS){bookDays.push(cur);cur=[];n=0}});
    if(cur.length)bookDays.push(cur);
    return d;
  }).catch(e=>{bookLoading=null;throw e});
  return bookLoading;
}
// Which day of the book today is: the reading starts on the day you first open it, or the day you pick
function bookToday(){
  if(!book.start){book.start=dayKey(new Date());saveBook()}
  const [y,m,d]=book.start.split('-').map(Number), t=new Date(), days=Math.round((new Date(t.getFullYear(),t.getMonth(),t.getDate())-new Date(y,m-1,d))/864e5);
  return Math.max(0,book.first+days)%bookDays.length;
}
const chName=c=>c.n==='Epilogue'?'Epilogue':'Chapter '+c.n;
const dayName=i=>{const cs=bookDays[i].map(j=>bookData.chapters[j]);return cs.length>1?chName(cs[0])+' to '+cs[cs.length-1].n:chName(cs[0])};
// A day's pages: a title page for each chapter, then its text set flush left, six lines to a page, each paragraph on a new line
function bookBuild(i){
  if(bookPagesFor===i)return bookPages;
  const pages=[];
  bookDays[i].forEach(j=>{
    const c=bookData.chapters[j];
    pages.push({text:'{v} '+(c.n==='Epilogue'?'EPILOGUE':'CHAPTER '+c.n)+' {v}\n\n'+(c.n==='Epilogue'?'MOBY-DICK':c.title),ch:c});
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
  const from=minsOf(book.from), to=Math.max(from+30,minsOf(book.to));
  const first=bookData.chapters[bookDays[i][0]];
  if(now<from)return {key:i+':before',text:'MOBY-DICK\n\n'+chName(first).toUpperCase()+'\n'+(first.n==='Epilogue'?'':first.title.toUpperCase()+'\n')+'FROM '+fmtMins(from).toUpperCase(),status:'Today: '+dayName(i)+', from '+fmtMins(from)+'.'};
  if(now>=to){const n=(i+1)%bookDays.length, c=bookData.chapters[bookDays[n][0]];
    return {key:i+':after',text:'MOBY-DICK\n\nTOMORROW, '+chName(c).toUpperCase()+'\n'+(c.n==='Epilogue'?'':c.title.toUpperCase()),status:'Today’s reading is done. Tomorrow: '+dayName(n)+', from '+fmtMins(from)+'.'}}
  const k=Math.min(pages.length-1,Math.floor((now-from)/(to-from)*pages.length)), p=pages[k], every=(to-from)/pages.length;
  return {key:i+':'+k,text:p.text,cells:p.cells,
    status:chName(p.ch)+(p.ch.n==='Epilogue'?'':', '+p.ch.title)+' · page '+(k+1)+' of '+pages.length+' · a new page '+(every>=1.5?'about every '+Math.round(every)+' minutes':'every minute or so')+'.'};
}
function bookSetStatus(t){$('bookStatus').textContent=t}
function bookCells(){
  if(!bookData){bookLoad().then(()=>{try{renderChannels()}catch(e){}}).catch(()=>{});return toTargets('MOBY-DICK\n\nHERMAN MELVILLE').cells}
  const b=bookNow(); return b.cells||toTargets(b.text).cells;
}
function bookShow(force){
  if(mode!=='book')return;
  const b=bookNow(); bookSetStatus(b.status);
  if(!force&&b.key===bookShown)return; bookShown=b.key;
  send(b.cells?'':b.text,Object.assign({label:'Book: Moby-Dick'},b.cells?{cells:b.cells}:{}));
}
async function startBook(){
  stopModes(); mode='book'; store.set('fb.mode','book'); $('bookBtn').classList.add('on'); setStatus(busy?'Flipping':'Showing');
  bookShown='';
  try{await bookLoad()}catch(e){if(mode==='book'){bookSetStatus('Couldn’t load the book. Check the internet connection; the board will try again.');send('MOBY-DICK\n\nCOULDN\'T LOAD\nTHE BOOK')}timer=setInterval(()=>{bookLoad().then(()=>bookShow(true)).catch(()=>{})},60000);return}
  if(mode!=='book')return;
  bookFillDays(); bookShow(true);
  timer=setInterval(()=>bookShow(false),15000);
}
$('bookBtn').onclick=()=>{if(mode==='book')stopModes();else startBook()};
// Settings: reading hours, and which day of the book to read today
function bookFillDays(){
  const sel=$('bookDay'); if(!bookDays||sel.options.length===bookDays.length){if(bookDays)sel.value=String(bookToday());return}
  sel.innerHTML='';
  bookDays.forEach((ids,i)=>{const o=document.createElement('option');o.value=String(i);const c=bookData.chapters[ids[0]];o.textContent='Day '+(i+1)+' · '+dayName(i)+(c.n==='Epilogue'?'':': '+c.title);sel.appendChild(o)});
  sel.value=String(bookToday());
}
$('bookFrom').value=book.from; $('bookTo').value=book.to;
['bookFrom','bookTo'].forEach(id=>{$(id).onchange=()=>{
  const v=$(id).value; if(!/^\d\d:\d\d$/.test(v))return; book[id==='bookFrom'?'from':'to']=v;
  if(minsOf(book.to)<=minsOf(book.from)){book.to=book.from===book.to?'22:00':book.to;$('bookTo').value=book.to}
  saveBook(); if(mode==='book')bookShow(true); else try{renderChannels()}catch(e){}
}});
$('bookDay').onchange=()=>{book.start=dayKey(new Date());book.first=+$('bookDay').value;saveBook();bookPagesFor=null;if(mode==='book')bookShow(true);else try{renderChannels()}catch(e){}};
bookLoad().then(bookFillDays).catch(()=>{});
