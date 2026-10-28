// Offline: de app en de leergangen blijven beschikbaar zonder netwerk.
const CACHE = 'lesdag-v5';
const SHELL = ['./', 'index.html', 'app.css', 'app.js', 'm365.js', 'config.js', 'auth.html', 'data/basis.json',
  'vendor/msal-browser.min.js', 'vendor/msal-redirect-bridge.min.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
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
    e.respondWith(caches.match(e.request).then(m => m || fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; })));
  }
});
