// E-Code PWA Service Worker
// Provides offline functionality and caching for the E-Code platform

const CACHE_VERSION = 'v1';
const CACHE_PREFIX = 'e-code-pwa';
const STATIC_CACHE = `${CACHE_PREFIX}-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `${CACHE_PREFIX}-dynamic-${CACHE_VERSION}`;
const API_CACHE = `${CACHE_PREFIX}-api-${CACHE_VERSION}`;

// Core shell files to precache
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/favicon.svg',
  // Note: Main app CSS/JS files are added dynamically by the build process
  // The registerServiceWorker will add them during runtime
];

// Install event - precache core shell
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Precaching core shell files');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Service worker installed successfully');
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Precaching failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    Promise.all([
      // Take control of all pages immediately
      self.clients.claim(),
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName.startsWith(CACHE_PREFIX) && 
                     !cacheName.includes(CACHE_VERSION);
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
    ]).then(() => {
      console.log('[SW] Service worker activated successfully');
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
  
  // Skip external requests and dev server assets
  if (!url.origin.includes(self.location.origin) && 
      !url.pathname.startsWith('/_vite/')) {
    return;
  }
  
  event.respondWith(handleRequest(request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  try {
    // API requests - Network first with cache fallback
    if (pathname.startsWith('/api/')) {
      return await networkFirstStrategy(request, API_CACHE);
    }
    
    // Static assets (images, fonts, etc.) - Cache first
    if (isStaticAsset(pathname)) {
      return await cacheFirstStrategy(request, STATIC_CACHE);
    }
    
    // JS/CSS assets - Stale while revalidate
    if (isAppAsset(pathname)) {
      return await staleWhileRevalidateStrategy(request, DYNAMIC_CACHE);
    }
    
    // HTML pages - Network first with cache fallback
    if (pathname === '/' || pathname.endsWith('.html') || !pathname.includes('.')) {
      return await networkFirstStrategy(request, DYNAMIC_CACHE);
    }
    
    // Default - network first
    return await networkFirstStrategy(request, DYNAMIC_CACHE);
    
  } catch (error) {
    console.error('[SW] Request handling failed:', error);
    
    // Return offline fallback for HTML pages
    if (pathname === '/' || pathname.endsWith('.html') || !pathname.includes('.')) {
      const cache = await caches.open(STATIC_CACHE);
      const cachedResponse = await cache.match('/');
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // Let the browser handle the error
    throw error;
  }
}

// Cache-first strategy
async function cacheFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  const networkResponse = await fetch(request);
  
  if (networkResponse.ok) {
    cache.put(request, networkResponse.clone());
  }
  
  return networkResponse;
}

// Network-first strategy
async function networkFirstStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Always try to fetch from network in background
  const networkResponsePromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => {
      // Network failed, that's okay for this strategy
    });
  
  // Return cached response immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // If no cached response, wait for network
  return await networkResponsePromise;
}

// Helper functions
function isStaticAsset(pathname) {
  const staticExtensions = [
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',
    '.woff', '.woff2', '.ttf', '.eot',
    '.ico', '.json'
  ];
  
  return staticExtensions.some(ext => pathname.endsWith(ext));
}

function isAppAsset(pathname) {
  return pathname.startsWith('/assets/') || 
         pathname.endsWith('.js') || 
         pathname.endsWith('.css') ||
         pathname.endsWith('.mjs');
}

// Handle messages from the app (for update notifications)
self.addEventListener('message', (event) => {
  console.log('[SW] Received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Skipping waiting and activating new service worker');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_MAIN_ASSETS') {
    console.log('[SW] Caching main app assets:', event.data.assets);
    cacheMainAssets(event.data.assets);
  }
});

// Cache main app assets
async function cacheMainAssets(assets) {
  try {
    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll(assets);
    console.log('[SW] Main app assets cached successfully');
  } catch (error) {
    console.error('[SW] Failed to cache main app assets:', error);
  }
}

// Handle push notifications (future feature)
self.addEventListener('push', (event) => {
  if (event.data) {
    console.log('[SW] Push notification received:', event.data.text());
    // Future: Handle push notifications
  }
});

console.log('[SW] Service worker script loaded');