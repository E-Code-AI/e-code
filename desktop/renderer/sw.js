// Service Worker for E-Code Platform
// Version: 1.0.0

const CACHE_NAME = 'ecode-v1';
const DYNAMIC_CACHE_NAME = 'ecode-dynamic-v1';
const OFFLINE_URL = '/offline.html';

// Assets to cache on install
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/favicon.svg',
  '/assets/logo.svg',
  // Add critical CSS and JS files that will be generated
];

// Cache strategies
const CACHE_STRATEGIES = {
  // Network first, fallback to cache
  networkFirst: [
    '/api/',
    '/auth/',
  ],
  // Cache first, fallback to network
  cacheFirst: [
    '/assets/',
    '/images/',
    '/fonts/',
    '.svg',
    '.png',
    '.jpg',
    '.jpeg',
    '.webp',
    '.woff',
    '.woff2',
    '.ttf',
  ],
  // Network only (no caching)
  networkOnly: [
    '/api/monitoring/',
    '/api/realtime/',
    '/ws',
  ],
  // Stale while revalidate
  staleWhileRevalidate: [
    '.js',
    '.css',
    '.json',
  ],
};

// Maximum cache sizes
const CACHE_LIMITS = {
  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
  maxEntries: 500,
  maxImageSize: 5 * 1024 * 1024, // 5MB per image
  maxApiCacheAge: 60 * 5, // 5 minutes for API responses
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching static assets');
      // Only cache existing static assets
      return Promise.allSettled(
        STATIC_CACHE_URLS.map((url) =>
          cache.add(url).catch((error) => {
            console.warn(`[ServiceWorker] Failed to cache ${url}:`, error);
          })
        )
      );
    })
  );
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-HTTP requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Determine caching strategy
  const strategy = getCacheStrategy(url, request);

  switch (strategy) {
    case 'networkFirst':
      event.respondWith(networkFirst(request));
      break;
    case 'cacheFirst':
      event.respondWith(cacheFirst(request));
      break;
    case 'networkOnly':
      event.respondWith(networkOnly(request));
      break;
    case 'staleWhileRevalidate':
      event.respondWith(staleWhileRevalidate(request));
      break;
    default:
      event.respondWith(networkFirst(request));
  }
});

// Helper function to determine cache strategy
function getCacheStrategy(url, request) {
  const pathname = url.pathname;
  
  // Check network only patterns
  for (const pattern of CACHE_STRATEGIES.networkOnly) {
    if (pathname.includes(pattern)) {
      return 'networkOnly';
    }
  }

  // Check network first patterns (API calls)
  for (const pattern of CACHE_STRATEGIES.networkFirst) {
    if (pathname.includes(pattern)) {
      return 'networkFirst';
    }
  }

  // Check cache first patterns (static assets)
  for (const pattern of CACHE_STRATEGIES.cacheFirst) {
    if (pathname.includes(pattern) || pathname.endsWith(pattern)) {
      return 'cacheFirst';
    }
  }

  // Check stale while revalidate patterns
  for (const pattern of CACHE_STRATEGIES.staleWhileRevalidate) {
    if (pathname.endsWith(pattern)) {
      return 'staleWhileRevalidate';
    }
  }

  // Default to network first
  return 'networkFirst';
}

// Network first strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If it's a navigation request, return offline page
    if (request.mode === 'navigate') {
      const offlineResponse = await caches.match(OFFLINE_URL);
      if (offlineResponse) {
        return offlineResponse;
      }
    }
    
    throw error;
  }
}

// Cache first strategy
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Check if cache is still valid
    const cacheAge = getCacheAge(cachedResponse);
    if (cacheAge < CACHE_LIMITS.maxAgeSeconds * 1000) {
      return cachedResponse;
    }
  }
  
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Network only strategy
async function networkOnly(request) {
  return fetch(request);
}

// Stale while revalidate strategy
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  // Return cached response immediately if available
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok && request.method === 'GET') {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => {
    // Silently fail, we already have cache
  });
  
  return cachedResponse || fetchPromise;
}

// Get cache age helper
function getCacheAge(response) {
  const cacheDate = response.headers.get('date');
  if (!cacheDate) return Infinity;
  
  const cacheTime = new Date(cacheDate).getTime();
  const now = Date.now();
  
  return now - cacheTime;
}

// Message event - handle cache updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      cacheNames.forEach((cacheName) => {
        caches.delete(cacheName);
      });
    });
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    const urls = event.data.urls;
    caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
      cache.addAll(urls);
    });
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-actions') {
    event.waitUntil(syncOfflineActions());
  }
});

async function syncOfflineActions() {
  // Implement offline action syncing
  // This would sync any actions taken while offline
  console.log('[ServiceWorker] Syncing offline actions');
}

// Push notifications
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/assets/logo.svg',
      badge: '/assets/badge.svg',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1,
      },
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});

console.log('[ServiceWorker] Service Worker loaded');