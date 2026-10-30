// Offline: de app, de leergangen en de lettertypen blijven beschikbaar zonder netwerk.
const CACHE = 'lesdag-v13';
const SHELL = ['./', 'index.html', 'app.css', 'app.js', 'm365.js', 'config.js', 'auth.html', 'data/basis.json', 'data/beoordeling.json',
  'vendor/msal-browser.min.js', 'vendor/msal-redirect-bridge.min.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png'];
// precies dezelfde link als in index.html; daarbij de lettertypebestanden voor Latijnse tekst (latin en latin-ext)
const LETTERS = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:ital,wght@0,400;0,600;0,700;1,400&family=Encode+Sans+Condensed:wght@700;800;900&display=swap';
const letters = c => fetch(LETTERS).then(r => { if (!r.ok) return; const kopie = r.clone(); return r.text().then(css => {
  const blokken = css.split(/(?=\/\*\s*[a-z-]+\s*\*\/)/i).filter(b => /^\/\*\s*latin(-ext)?\s*\*\//i.test(b));
  const L = [...new Set(blokken.flatMap(b => [...b.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map(m => m[1])))];
  return c.put(LETTERS, kopie).then(() => Promise.all(L.map(u => fetch(u, { mode: 'cors' }).then(f => f.ok ? c.put(u, f) : null).catch(() => null))));
}); }).catch(() => {});
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).then(() => letters(c))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // Microsoft-login en Graph nooit uit de cache
  if (/login\.microsoftonline\.com|graph\.microsoft\.com/.test(u.host)) return;
  if (u.origin === location.origin) {
    // eerst netwerk (nieuwste versie), anders cache. Doorsturen naar de Cloudflare Access-inlog wordt nooit bewaard.
    e.respondWith(fetch(e.request).then(r => { if (r.ok && r.type === 'basic' && !r.redirected) { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); } return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
  } else if (/fonts\.(googleapis|gstatic)\.com/.test(u.host)) {
    // lettertypen eerst uit de cache; Google stuurt Vary-koppen mee, die tellen hier niet
    e.respondWith(caches.match(e.request, { ignoreVary: true }).then(m => m || fetch(e.request).then(r => { if (r.ok || r.type === 'opaque') { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); } return r; })));
  }
});
