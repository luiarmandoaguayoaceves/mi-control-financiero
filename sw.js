// ============================================================
// Service Worker: PWA instalable + offline.
// Estrategia:
//   - Navegación e index.html : network-first (los deploys llegan)
//   - data/app-data.json      : network-first (la base se actualiza), cache offline
//   - Resto de assets (css/js) : cache-first con actualización en segundo plano
// Al publicar cambios importantes, sube CACHE_VERSION.
// ============================================================
const CACHE_VERSION = 'mcf-pwa-v1';
const CORE = [
  '/',
  '/index.html',
  '/css/tailwind.css',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/src/app.js',
  '/src/store.js',
  '/src/seed.js',
  '/src/finance.js',
  '/src/format.js',
  '/src/models.js',
  '/src/ui.js',
  '/src/screens/appState.js',
  '/src/screens/dashboard.js',
  '/src/screens/movements.js',
  '/src/screens/card.js',
  '/src/screens/funds.js',
  '/src/screens/services.js',
  '/src/screens/goals.js',
  '/src/screens/budget.js',
  '/src/screens/assets.js',
  '/src/screens/reports.js',
  '/src/screens/settings.js',
  '/src/screens/more.js',
  '/src/screens/modals.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Página (navegación): red primero, caché si no hay red
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('/index.html'))),
    );
    return;
  }

  // JSON base del proyecto: red primero (para recibir actualizaciones), caché offline
  if (url.pathname === '/data/app-data.json') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req)),
    );
    return;
  }

  // Assets estáticos: caché primero, actualización en segundo plano
  e.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
