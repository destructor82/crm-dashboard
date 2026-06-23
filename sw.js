// CRM Recovery Unit — Service Worker
// Caches the app shell so it works offline and enables PWA install prompt

const CACHE_NAME = 'crm-recovery-v1';
const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-512.svg',
];

// ── Install: pre-cache shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(SHELL_ASSETS).catch(() => {
        // Non-fatal: external CDN assets may be blocked
      });
    })
  );
  self.skipWaiting();
});

// ── Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first with cache fallback
self.addEventListener('fetch', event => {
  // Only handle GET requests for same-origin + CDN assets
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline fallback
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // If the main doc is requested, serve cached index
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
