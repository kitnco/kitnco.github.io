const CACHE = 'runkit-v6';
const ASSETS = [
  './', './index.html', './library.html',
  './manifest.json', './icon-192.png', './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.all(ASSETS.map(url =>
        fetch(new Request(url, { cache: 'reload' }))
          .then(r => c.put(url, r))
          .catch(() => {})
      ))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(
      fetch(req).then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return r;
      }).catch(() => caches.match(req).then(m => m || caches.match('./index.html')))
    );
  } else {
    e.respondWith(caches.match(req).then(m => m || fetch(req)));
  }
});
