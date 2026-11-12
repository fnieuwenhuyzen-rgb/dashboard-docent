// Lokale server voor de melodievideo's. Gebruik: node server.js <werkmap met data.json> <pad naar verovio-toolkit-wasm.js> [poort]
// De pagina neemt op in de browser en stuurt de video terug; die komt in <werkmap>/video.
const http = require('http'), fs = require('fs'), path = require('path');
const [, , werk, verovio, poort] = process.argv;
const vid = path.join(werk, 'video');
fs.mkdirSync(vid, { recursive: true });
const stuur = (r, p, ct) => { r.setHeader('content-type', ct); r.setHeader('cache-control', 'no-store'); fs.createReadStream(p).pipe(r); };
http.createServer((q, r) => {
  const u = q.url.split('?')[0];
  if (q.method === 'POST') { const w = fs.createWriteStream(path.join(vid, path.basename(decodeURIComponent(u)))); q.pipe(w); w.on('finish', () => r.end('ok')); return; }
  if (u === '/') return stuur(r, path.join(__dirname, 'pagina.html'), 'text/html;charset=utf-8');
  if (u === '/data.json') return stuur(r, path.join(werk, 'data.json'), 'application/json');
  if (u === '/verovio.js') return stuur(r, verovio, 'text/javascript');
  r.statusCode = 404; r.end();
}).listen(+poort || 8795, '127.0.0.1');
