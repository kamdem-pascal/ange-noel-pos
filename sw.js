const CACHE = 'ange-noel-v2.1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Do not intercept non-http/https
  if (!url.protocol.startsWith('http')) return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) {
        // Fetch in background to update cache (stale-while-revalidate)
        fetch(e.request).then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            caches.open(CACHE).then((cache) => cache.put(e.request, networkRes.clone()));
          }
        }).catch(() => {});
        return cached;
      }
      return fetch(e.request).then((networkRes) => {
        if (networkRes && networkRes.status === 200) {
          const clone = networkRes.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, clone));
        }
        return networkRes;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
