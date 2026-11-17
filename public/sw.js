// Offline: de app, de leergangen en de lettertypen blijven beschikbaar zonder netwerk. Lettertypen zelf aangeboden sinds 17-11 (vendor/fonts).
const CACHE = 'lesdag-v84';
const NET_WACHT = 2000; // ms wachten op het netwerk voordat de cache voorgaat
const SHELL = ['./', 'index.html', 'vooraf.js', 'app.css', 'app.js', 'lesmodus.js', 'lesfotos.js', 'lesklok.js', 'regie.js', 'functies.js', 'bm-reken.js', 'bm-overzicht.js', 'bm-pdf.js', 'reclame.js', 'sync.js', 'agendafeed.js', 'toetsdatum.js', 'staat.js', 'logboek.js', 'kopie.js', 'm365.js', 'config.js', 'data/basis.json', 'data/beoordeling.json', 'data/notities.json', 'data/reclame.json', 'vendor/pptxgen.bundle.js', 'vendor/qrcode.js',
  'vendor/fonts/EncodeSans-latin.woff2', 'vendor/fonts/EncodeSans-latin-ext.woff2', 'vendor/fonts/EncodeSans-Light.ttf', 'vendor/fonts/EncodeSans-Bold.ttf', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (u.origin === location.origin && u.pathname.includes('/api/')) return; // de staat nooit in de cache
  if (u.origin === location.origin) {
    // eerst netwerk (nieuwste versie), anders cache. Doorsturen naar de Cloudflare Access-inlog wordt nooit bewaard.
    // Duurt het netwerk langer dan NET_WACHT (slecht wifi op school) en staat het bestand in de cache, dan komt dat direct; het netwerk loopt door en ververst de cache voor de volgende keer.
    const net = fetch(e.request).then(r => { if (r.ok && r.type === 'basic' && !r.redirected) { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); } return r; });
    e.waitUntil(net.catch(() => {}));
    e.respondWith(Promise.race([net.catch(() => null), new Promise(ok => setTimeout(ok, NET_WACHT, null))])
      .then(r => r || caches.match(e.request, { ignoreSearch: true }).then(m => m || net)));
  }
});
