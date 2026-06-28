/* ============================================================
   Dwarkadhish — Service Worker
   - First visit: pre-caches HTML pages + critical assets
   - Subsequent visits: serves from cache instantly
   - Lazy-caches images as user views them
   - Works fully offline once visited
   ============================================================ */

const CACHE_VERSION = 'dwk-v1';
const STATIC_CACHE  = CACHE_VERSION + '-static';
const RUNTIME_CACHE = CACHE_VERSION + '-runtime';

// Pre-cache only the essential shell (small, fast install)
const PRECACHE_URLS = [
  'index.html',
  'about.html',
  'contact.html',
  'favicon.svg',
  'favicon.png',
  'manifest.json',
  'assets/app.css',
  'assets/app.js'
];

// Install: pre-cache shell
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(function (cache) {
        return cache.addAll(PRECACHE_URLS).catch(function () { /* ignore individual failures */ });
      })
      .then(function () { return self.skipWaiting(); })
  );
});

// Activate: clean up old caches
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) {
          return k.indexOf(CACHE_VERSION) !== 0;
        }).map(function (k) {
          return caches.delete(k);
        })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

// Fetch: smart caching strategy
self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;

  var url;
  try {
    url = new URL(request.url);
  } catch (e) { return; }

  // Skip cross-origin (Google Maps embed, fonts CDN, etc.)
  if (url.origin !== self.location.origin) return;

  // Skip non-cacheable schemes
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  var accept = request.headers.get('accept') || '';
  var isHTML = request.mode === 'navigate' || accept.indexOf('text/html') !== -1;

  if (isHTML) {
    // HTML pages → stale-while-revalidate (instant load, refresh in background)
    event.respondWith(staleWhileRevalidate(request));
  } else {
    // Images, CSS, JS, fonts → cache-first (saves data, super fast)
    event.respondWith(cacheFirst(request));
  }
});

// Strategies
function staleWhileRevalidate(request) {
  return caches.match(request).then(function (cached) {
    var networkPromise = fetch(request).then(function (response) {
      if (response && response.ok) {
        var copy = response.clone();
        caches.open(RUNTIME_CACHE).then(function (cache) {
          cache.put(request, copy).catch(function () {});
        });
      }
      return response;
    }).catch(function () {
      return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
    });
    return cached || networkPromise;
  });
}

function cacheFirst(request) {
  return caches.match(request).then(function (cached) {
    if (cached) return cached;
    return fetch(request).then(function (response) {
      if (response && response.ok) {
        var copy = response.clone();
        caches.open(RUNTIME_CACHE).then(function (cache) {
          cache.put(request, copy).catch(function () {});
        });
      }
      return response;
    }).catch(function () {
      return new Response('', { status: 503, statusText: 'Offline' });
    });
  });
}
