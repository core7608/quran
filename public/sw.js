/* Quran App service worker — offline shell + runtime caching.
 *
 * Strategy:
 *  - Navigation requests: network-first, falling back to the cached app shell
 *    so the PWA opens offline and still receives new builds when online.
 *  - Same-origin static assets (JS/CSS/fonts/images/manifest): cache-first,
 *    with the cache refreshed in the background.
 *  - Cross-origin requests (recitation audio on AlQuran Cloud, tafsir/
 *    translation APIs): never cached here — passed straight through to the
 *    network so audio streaming and live data always work.
 */

const CACHE_VERSION = 'v1';
const SHELL_CACHE = `quran-shell-${CACHE_VERSION}`;
const ASSET_CACHE = `quran-assets-${CACHE_VERSION}`;

// App shell. The hashed JS/CSS bundles are picked up at runtime from the
// navigation response, so they are not listed here.
const SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-512-maskable.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Best-effort: a single missing icon must not fail the whole install.
      await Promise.all(
        SHELL_URLS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => undefined)
        )
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE && key !== ASSET_CACHE)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only ever handle idempotent GETs.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never touch cross-origin traffic (audio, tafsir, translation APIs).
  if (url.origin !== self.location.origin) return;

  // App navigations: network-first with a cached-shell fallback.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  // Same-origin static assets: cache-first, refreshed in the background.
  event.respondWith(cacheFirstAsset(request));
});

async function networkFirstNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put('/index.html', response.clone());
    }
    return response;
  } catch {
    const cached = (await cache.match('/index.html')) || (await cache.match('/')) || (await cache.match(request));
    if (cached) return cached;
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

async function cacheFirstAsset(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  if (cached) {
    // Refresh in the background; do not block the response.
    revalidateInBackground(cache, request);
    return cached;
  }
  try {
    const response = await fetch(request);
    if (response && (response.ok || response.type === 'opaqueredirect')) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const fallback = await cache.match(request);
    if (fallback) return fallback;
    throw new Error(`Unavailable offline: ${request.url}`);
  }
}

function revalidateInBackground(cache, request) {
  fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response);
    })
    .catch(() => undefined);
}
