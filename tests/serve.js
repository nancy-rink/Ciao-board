// Serves the repository as GitHub Pages would, on port 8765
const http=require('http'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.gif':'image/gif','.ico':'image/x-icon'};
http.createServer((req,res)=>{
  let p=decodeURIComponent(new URL(req.url,'http://x').pathname);
  if(p.endsWith('/'))p+='index.html';
  const f=path.join(root,path.normalize(p));
  if(!f.startsWith(root)){res.statusCode=403;res.end();return}
  fs.readFile(f,(e,b)=>{if(e){res.statusCode=404;res.end('not found');return}res.setHeader('Content-Type',types[path.extname(f)]||'application/octet-stream');res.end(b)});
}).listen(+(process.env.PORT||8765),'127.0.0.1');
