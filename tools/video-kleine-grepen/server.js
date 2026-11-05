const http=require('http'),fs=require('fs'),path=require('path');
const f="C:/Users/nwn/OneDrive - CSG Prins Maurits/Documenten - Sectie Muziek/01 Onderbouw muziek/03 Klas 3/Kerst/God Rest Ye (vwo)/Video's voor YouTube/God Rest Ye Merry Gentlemen - niveau 1 - gitaar meespelen.mp4";
const dir=__dirname+'/video';
function stuur(q,r,p,ct){const s=fs.statSync(p).size,m=/bytes=(\d+)-(\d*)/.exec(q.headers.range||'');if(m){const a=+m[1],b=m[2]?+m[2]:s-1;r.writeHead(206,{'content-type':ct,'accept-ranges':'bytes','content-range':`bytes ${a}-${b}/${s}`,'content-length':b-a+1});fs.createReadStream(p,{start:a,end:b}).pipe(r);}else{r.writeHead(200,{'content-type':ct,'accept-ranges':'bytes','content-length':s});fs.createReadStream(p).pipe(r);}}
http.createServer((q,r)=>{const u=q.url.split('?')[0];
 if(q.method==='POST'){const w=fs.createWriteStream(path.join(dir,path.basename(u)));q.pipe(w);w.on('finish',()=>r.end('ok'));return;}
 if(u==='/v.mp4')return stuur(q,r,f,'video/mp4');
 if(u.startsWith('/uit/'))return stuur(q,r,path.join(dir,path.basename(u)),u.endsWith('webm')?'video/webm':'video/mp4');
 const p=path.join(dir,u==='/'?'pagina.html':path.basename(u));if(fs.existsSync(p)){r.setHeader('content-type','text/html;charset=utf-8');r.setHeader('cache-control','no-store');return fs.createReadStream(p).pipe(r);}r.statusCode=404;r.end();
}).listen(8791,'127.0.0.1');
