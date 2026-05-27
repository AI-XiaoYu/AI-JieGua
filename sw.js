const CACHE = 'paipan-v3';
const URLS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (e) => {
  // Force new SW to activate immediately — don't wait for old clients to close
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(URLS).catch(() => {}))
  );
});

self.addEventListener('activate', (e) => {
  // Nuke every single old cache, then claim all clients
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    ).then(() => {
      return caches.open(CACHE).then((cache) =>
        cache.addAll(URLS).catch(() => {})
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      var fetched = fetch(e.request).then((res) => {
        if (res.status === 200) {
          var clone = res.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, clone));
        }
        return res;
      });
      // Network-first for JS modules, cache-first for pre-cached assets
      return cached || fetched;
    })
  );
});
