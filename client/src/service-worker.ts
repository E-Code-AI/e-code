/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

const CACHE_VERSION = 'v1';
const CACHE_PREFIX = 'e-code-pwa';
const STATIC_CACHE = `${CACHE_PREFIX}-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}-runtime-${CACHE_VERSION}`;

// Assets to precache during install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

// Install event - precache core assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Precaching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      console.log('[SW] Static assets precached successfully');
      return self.skipWaiting();
    }).catch((error) => {
      console.error('[SW] Precaching failed:', error);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            // Remove old caches that don't match current version
            return cacheName.startsWith(CACHE_PREFIX) && 
                   cacheName !== STATIC_CACHE && 
                   cacheName !== RUNTIME_CACHE;
          })
          .map((cacheName) => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => {
      console.log('[SW] Service worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  event.respondWith(handleFetch(request));
});

async function handleFetch(request: Request): Promise<Response> {
  const url = new URL(request.url);

  // API requests - Network first strategy
  if (url.pathname.startsWith('/api/')) {
    return networkFirst(request);
  }

  // Static assets (JS, CSS, images, fonts) - Cache first strategy
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.gif') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.ttf')
  ) {
    return cacheFirst(request);
  }

  // HTML pages and other resources - Stale while revalidate
  return staleWhileRevalidate(request);
}

// Cache first strategy - for static assets
async function cacheFirst(request: Request): Promise<Response> {
  const cache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache first fetch failed:', error);
    throw error;
  }
}

// Network first strategy - for API requests
async function networkFirst(request: Request): Promise<Response> {
  const cache = await caches.open(RUNTIME_CACHE);

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', error);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Stale while revalidate strategy - for HTML and other resources
async function staleWhileRevalidate(request: Request): Promise<Response> {
  const cache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch((error) => {
    console.error('[SW] Stale while revalidate fetch failed:', error);
    return cachedResponse || new Response('Offline', { status: 503 });
  });

  return cachedResponse || fetchPromise;
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    console.log('[SW] Received SKIP_WAITING message');
    self.skipWaiting();
  }
});

console.log('[SW] Service worker script loaded');