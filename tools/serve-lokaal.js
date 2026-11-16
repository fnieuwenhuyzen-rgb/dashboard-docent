// Statische server voor Lesdag (public/) om lokaal te testen; launch-entry `lesdag-proef`.
// Gebruik: node serve-lokaal.js [map] [poort] [--api]; zonder map de public/ naast deze tools, poort anders uit PORT of 8732.
// --api: ook /api/* uit functions/api, met een nagebootste database in het geheugen (tools/nep-d1.js) en een vast testadres
// in plaats van Cloudflare Access. Alles is weg als de server stopt. Zo zijn bord en tablet-regie (/api/regie) lokaal te testen.
const http = require('http'), fs = require('fs'), path = require('path'), { pathToFileURL } = require('url');
const pos = process.argv.slice(2).filter(a => !a.startsWith('--')), metApi = process.argv.includes('--api');
const root = pos[0] ? path.resolve(pos[0]) : path.join(__dirname, '..', 'public');
const poort = +pos[1] || +process.env.PORT || 8732;
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ttf': 'font/ttf', '.webmanifest': 'application/manifest+json' };
let env = null; const routes = {};
if (metApi) env = { DB: require('./nep-d1.js').nepD1(), DEV_EMAIL: 'test@voorbeeld.nl' };
async function api(q, r, p) {
  const naam = p.slice('/api/'.length);
  if (!/^[a-z]+$/.test(naam) || !fs.existsSync(path.join(__dirname, '..', 'functions', 'api', naam + '.js'))) { r.writeHead(404); return r.end('niet gevonden'); }
  routes[naam] = routes[naam] || await import(pathToFileURL(path.join(__dirname, '..', 'functions', 'api', naam + '.js')).href);
  const delen = []; for await (const d of q) delen.push(d);
  const headers = new Headers(); for (const [k, v] of Object.entries(q.headers)) if (typeof v === 'string') headers.set(k, v);
  const req = new Request('http://localhost:' + poort + q.url, { method: q.method, headers, body: ['GET', 'HEAD'].includes(q.method) ? undefined : Buffer.concat(delen) });
  const res = await routes[naam].onRequest({ request: req, env });
  r.writeHead(res.status, Object.fromEntries(res.headers)); r.end(Buffer.from(await res.arrayBuffer()));
}
http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]);
  if (metApi && p.startsWith('/api/')) return api(q, r, p).catch(e => { console.error(e); r.writeHead(500); r.end('fout'); });
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  if (!f.startsWith(path.normalize(root))) { r.writeHead(403); return r.end(); }
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end('niet gevonden'); } r.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); r.end(d); });
}).listen(poort, () => console.log('lesdag op poort ' + poort + ' (' + root + ')' + (metApi ? ' met /api (nagebootste database)' : '')));
