// Offline cache for «Голова». Serves from cache instantly,
// refreshes files in the background so updates show on the next open.
const CACHE = 'golova-v12';
const SHELL = ['./', './index.html', './keystore.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const host = new URL(req.url).host;
  // only the app itself and its fonts; never cache the sync API
  if (host !== self.location.host && host !== 'fonts.googleapis.com' && host !== 'fonts.gstatic.com') return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const key = req.mode === 'navigate' && !new URL(req.url).pathname.endsWith('office.html') ? './index.html' : req;
    const hit = await cache.match(key, { ignoreSearch: req.mode === 'navigate' });
    const fresh = host === self.location.host ? fetch(req.url, { cache: 'no-cache' }) : fetch(req);
    const net = fresh.then(res => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(key, res.clone());
      return res;
    }).catch(() => hit);
    if (new URL(req.url).pathname.endsWith('office.html')) return net.then(r => r || hit, () => hit); // офис: сначала свежая версия
    return hit || net;
  }));
});
