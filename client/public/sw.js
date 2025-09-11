// E-Code Platform Service Worker
// Provides offline functionality and PWA capabilities

const CACHE_NAME = 'e-code-v1';
const STATIC_CACHE_NAME = 'e-code-static-v1';
const API_CACHE_NAME = 'e-code-api-v1';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/manifest.json',
  '/offline.html',
  // Core CSS and JS will be automatically cached by Vite
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/user/profile',
  '/api/projects',
  '/api/templates',
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== STATIC_CACHE_NAME && 
                cacheName !== API_CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// Fetch event - handle requests with cache-first strategy for static files
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests with network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(API_CACHE_NAME)
        .then((cache) => {
          return fetch(request)
            .then((response) => {
              // Only cache successful GET requests
              if (request.method === 'GET' && response.status === 200) {
                cache.put(request, response.clone());
              }
              return response;
            })
            .catch(() => {
              // Return cached version if available
              return cache.match(request);
            });
        })
    );
    return;
  }

  // Handle static files with cache-first strategy
  if (request.destination === 'image' || 
      request.destination === 'script' || 
      request.destination === 'style' ||
      request.destination === 'font') {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          if (response) {
            return response;
          }
          
          return fetch(request)
            .then((response) => {
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(request, responseClone);
                  });
              }
              return response;
            });
        })
    );
    return;
  }

  // Handle navigation requests with network-first, cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful page loads
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          // Try to return cached version
          return caches.match(request)
            .then((response) => {
              if (response) {
                return response;
              }
              // Return offline page as last resort
              return caches.match('/offline.html');
            });
        })
    );
    return;
  }

  // Default: try network first, then cache
  event.respondWith(
    fetch(request)
      .catch(() => {
        return caches.match(request);
      })
  );
});

// Handle background sync for when connection is restored
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered');
  
  if (event.tag === 'project-sync') {
    event.waitUntil(syncProjects());
  }
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New notification from E-Code',
    icon: '/logo-192.png',
    badge: '/logo-96.png',
    vibrate: [100, 50, 100],
    data: {
      url: '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification('E-Code Platform', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});

// Sync projects when connection is restored
async function syncProjects() {
  try {
    const cache = await caches.open(API_CACHE_NAME);
    const requests = await cache.keys();
    
    // Re-fetch API data to sync with server
    for (const request of requests) {
      if (request.url.includes('/api/projects')) {
        try {
          const response = await fetch(request);
          if (response.ok) {
            await cache.put(request, response.clone());
          }
        } catch (error) {
          console.log('[SW] Failed to sync:', request.url);
        }
      }
    }
  } catch (error) {
    console.log('[SW] Sync failed:', error);
  }
}

// Clean up old caches periodically
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_CLEANUP') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.startsWith('e-code-') && 
                !cacheName.includes('-v1')) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    );
  }
});