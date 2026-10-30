// Statische server voor Lesdag (public/) om lokaal te testen; launch-entries `lesdag-proef` en `lesdag-proef-nu`.
// Gebruik: node serve-lokaal.js [map] [poort]; zonder map de public/ naast deze tools, poort anders uit PORT of 8732.
const http = require('http'), fs = require('fs'), path = require('path');
const root = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, '..', 'public');
const poort = +process.argv[3] || +process.env.PORT || 8732;
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  if (!f.startsWith(path.normalize(root))) { r.writeHead(403); return r.end(); }
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end('niet gevonden'); } r.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); r.end(d); });
}).listen(poort, () => console.log('lesdag op poort ' + poort + ' (' + root + ')'));
