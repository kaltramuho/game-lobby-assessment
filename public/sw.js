const CACHE = 'merrin-shell-v2';
const PRECACHE = [
  '/',
  '/index.html',
  '/games.json',
  '/promos.json',
  '/wallet.json',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.all(
        PRECACHE.map(async (url) => {
          const res = await fetch(url);
          if (!res.ok) throw new Error(url);
          const headers = new Headers(res.headers);
          headers.delete('content-encoding');
          await cache.put(url, new Response(await res.blob(), { status: 200, headers }));
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(req);
        if (fresh.ok && !fresh.redirected) {
          const cache = await caches.open(CACHE);
          cache.put(req, fresh.clone());
        }
        return fresh;
      } catch {
        const cached = (await caches.match(req)) || (await caches.match(url.pathname));
        if (cached) return cached;
        if (req.mode === 'navigate') {
          const home = (await caches.match('/')) || (await caches.match('/index.html'));
          if (home) return home;
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      }
    })(),
  );
});
