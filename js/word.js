// Word of the day: one word a day in English or French, the same on every board, changing at midnight.
// The board turns through a few pages: the word, what it means, an example, and for French the example in English.
const WORD_LANGS=[{id:'en',name:'English',head:'{g} WORD OF THE DAY {g}'},{id:'fr',name:'French',head:'{b} MOT DU JOUR {b}'}];
const WORD_LANG=Object.fromEntries(WORD_LANGS.map(l=>[l.id,l]));
const word=Object.assign({lang:'en',every:20},store.get('fb.word',{}));
if(!WORD_LANG[word.lang])word.lang='en';
const saveWord=()=>store.set('fb.word',word);
const wordCache={};
let wordList=null, wordPage=0, wordShown='';
function wordLoad(){
  const lang=word.lang;
  if(!wordCache[lang])wordCache[lang]=fetch('words/'+lang+'.json').then(r=>{if(!r.ok)throw new Error(r.status);return r.json()}).catch(e=>{delete wordCache[lang];throw e});
  return wordCache[lang].then(l=>{if(word.lang===lang)wordList=l;return l});
}
// Every board counts days from the same date, so friends see the same word
function wordToday(){const t=new Date();return Math.round((new Date(t.getFullYear(),t.getMonth(),t.getDate())-new Date(2026,0,1))/864e5)}
function wordEntry(){return wordList[((wordToday()%wordList.length)+wordList.length)%wordList.length]}
function wordPages(){
  const e=wordEntry(), L=WORD_LANG[word.lang], q=s=>'"'+s+'"';
  const pages=[L.head+'\n\n'+e.w+'\n'+e.pos, e.def, q(e.ex)];
  if(e.tr)pages.push('IN ENGLISH:\n'+q(e.tr));
  return pages;
}
function wordSetStatus(t){$('wordStatus').textContent=t}
function wordText(){if(!wordList){wordLoad().then(()=>{try{renderChannels()}catch(e){}}).catch(()=>{});return WORD_LANG[word.lang].head+'\n\nLOADING'}return wordPages()[0]}
function wordShow(){
  if(mode!=='word'||!wordList)return;
  const pages=wordPages(), e=wordEntry(), key=word.lang+':'+e.w;
  if(key!==wordShown){wordShown=key;wordPage=0}
  send(pages[wordPage%pages.length],{label:'Word: '+e.w});
  wordPage=(wordPage+1)%pages.length;
  wordSetStatus('Today’s '+WORD_LANG[word.lang].name+' word: '+e.w+'. A new word comes at midnight.');
}
async function startWord(){
  stopModes(); mode='word'; store.set('fb.mode','word'); $('wordBtn').classList.add('on'); setStatus(busy?'Flipping':'Showing');
  wordShown=''; const lang=word.lang;
  try{await wordLoad()}catch(e){if(mode==='word'){wordSetStatus('Couldn’t load the words. Check the internet connection; the board will try again.');send(WORD_LANG[lang].head+'\n\nCOULDN\'T LOAD')}timer=setInterval(()=>{wordLoad().then(wordShow).catch(()=>{})},60000);return}
  if(mode!=='word'||word.lang!==lang)return;
  wordShow(); timer=setInterval(wordShow,word.every*1000);
}
function setWordLang(l){if(!WORD_LANG[l]||l===word.lang)return;word.lang=l;saveWord();wordList=null;$('wordLang').value=l}
$('wordBtn').onclick=()=>{if(mode==='word')stopModes();else startWord()};
$('wordLang').innerHTML=WORD_LANGS.map(l=>'<option value="'+l.id+'">'+l.name+'</option>').join(''); $('wordLang').value=word.lang;
$('wordLang').onchange=()=>{setWordLang($('wordLang').value);if(mode==='word')startWord();else wordLoad().then(()=>{try{renderChannels()}catch(e){}}).catch(()=>{})};
$('wordEvery').value=String(word.every);
$('wordEvery').onchange=()=>{word.every=+$('wordEvery').value;saveWord();if(mode==='word')startWord()};
wordLoad().catch(()=>{});
