// A small local stand-in for ntfy.sh: POST /topic, GET /topic/json?poll=1&since=, GET /topic/sse?since=.
// limit: answer every POST after that many with 429 and ntfy's daily-quota error, like a home network that's used its 250.
const http=require('http');
function start(port,{limit=Infinity}={}){
  const topics=new Map(), subs=new Map(); let n=0, posts=0;
  const msgs=t=>{if(!topics.has(t))topics.set(t,[]);return topics.get(t)};
  const after=(list,since)=>{if(!since||since==='all'||/^\d+h$/.test(since))return list;const i=list.findIndex(m=>m.id===since);return i<0?list:list.slice(i+1)};
  const server=http.createServer((req,res)=>{
    res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','*');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
    if(req.method==='OPTIONS'){res.end();return}
    const u=new URL(req.url,'http://x'), parts=u.pathname.split('/').filter(Boolean), topic=parts[0], since=u.searchParams.get('since');
    if(topic==='health'){res.end('ok');return}
    if(req.method==='POST'){
      if(++posts>limit){res.statusCode=429;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({code:42908,http:429,error:'limit reached: daily message quota reached'}));return}
      let b='';req.on('data',d=>b+=d);req.on('end',()=>{
        const m={id:'m'+(++n),time:Math.floor(Date.now()/1000),event:'message',topic,message:b};msgs(topic).push(m);
        (subs.get(topic)||[]).forEach(s=>s.write('data: '+JSON.stringify(m)+'\n\n'));
        res.setHeader('Content-Type','application/json');res.end(JSON.stringify(m))});return}
    if(parts[1]==='json'){res.setHeader('Content-Type','application/x-ndjson');res.end(after(msgs(topic),since).map(m=>JSON.stringify(m)).join('\n')+'\n');return}
    if(parts[1]==='sse'){
      res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Access-Control-Allow-Origin':'*'});res.write('event: open\ndata: {}\n\n');
      after(msgs(topic),since).forEach(m=>res.write('data: '+JSON.stringify(m)+'\n\n'));
      if(!subs.has(topic))subs.set(topic,[]);subs.get(topic).push(res);req.on('close',()=>subs.set(topic,subs.get(topic).filter(s=>s!==res)));return}
    res.statusCode=404;res.end();
  });
  return new Promise(ok=>server.listen(port,'127.0.0.1',()=>ok(server)));
}
module.exports={start};
if(require.main===module)start(+(process.env.PORT||8790));
