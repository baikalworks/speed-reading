/* Service worker: офлайн-кэш курса. При обновлении файлов поднимите VERSION. */
const VERSION = 'sr14-v2';
const CACHE = 'skorochtenie-' + VERSION;

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/app.css',
  './assets/data.js',
  './assets/core.js',
  './assets/train.js',
  './assets/app.js',
  './assets/img/favicon-32.png',
  './assets/img/icon-192.png',
  './assets/img/icon-512.png',
  './assets/img/icon-maskable-512.png',
  './assets/img/apple-touch-icon-180.png',
  './assets/img/fig_attention.png',
  './assets/img/fig_chunk.png',
  './assets/img/fig_eye.png',
  './assets/img/fig_map.png',
  './assets/img/fig_memory.png',
  './assets/img/fig_metrics.png',
  './assets/img/fig_modes.png',
  './assets/img/fig_pace.png',
  './assets/img/fig_progress.png',
  './assets/img/fig_protocol.png',
  './assets/img/fig_skim.png',
  './assets/img/fig_span.png',
  './assets/img/fig_sq3r.png',
  './assets/img/fig_voice.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(ASSETS.map((url) =>
      cache.add(new Request(url, { cache: 'reload' })).catch(() => null)
    ));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Навигация: сначала сеть, при отсутствии — сохранённая оболочка.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put('./index.html', fresh.clone());
        return fresh;
      } catch (e) {
        const cache = await caches.open(CACHE);
        return (await cache.match('./index.html')) || (await cache.match('./')) ||
          new Response('Курс недоступен офлайн. Откройте его онлайн один раз.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
      }
    })());
    return;
  }

  // Остальное: из кэша сразу, обновление — в фоне.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);
    const network = fetch(req).then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    return hit || (await network) || new Response('', { status: 504 });
  })());
});
