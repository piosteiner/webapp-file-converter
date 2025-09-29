/**
 * Service Worker for File Converter PWA
 * 
 * CACHING STRATEGY:
 * - Network-first for HTML (always fresh UI/navigation)
 * - Network-first for JavaScript (frequent feature updates)
 * - Cache-first for CSS/static assets (stable styling)
 * - Offline fallback for core functionality
 * 
 * This prioritizes freshness over aggressive caching since:
 * - File conversion tools change frequently
 * - UI updates are common during development
 * - User experience benefits from current features
 */

const CACHE_NAME = 'file-converter-v2.0.0';
const STATIC_CACHE = 'static-cache-v2.0.0';

// Critical assets for offline functionality (stable, rarely changing)
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/assets/styles/styles.css'
  // Note: HTML and JS files use network-first for freshness
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Installation failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip external requests (for GIF conversion server)
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  const url = new URL(event.request.url);
  
  // Network-first strategy for dynamic content
  const isHTMLDocument = event.request.destination === 'document' || url.pathname.endsWith('.html');
  const isJavaScript = url.pathname.endsWith('.js');
  const hasVersionParam = url.searchParams.has('v');
  
  // Always fetch fresh for HTML and JavaScript (frequent updates)
  if (isHTMLDocument || isJavaScript || hasVersionParam) {
    // Network-first: try network, fallback to cache if offline
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            // Cache the new version
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(event.request);
        })
    );
    return;
  }

  // Standard cache-first strategy for other resources
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          return cachedResponse;
        }

        // Otherwise, fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response (streams can only be consumed once)
            const responseToCache = response.clone();

            // Cache the response for future use
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // If offline and no cache, return a custom offline page
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// Background sync for file processing (if needed)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-file-sync') {
    event.waitUntil(
      // Handle background file processing if needed
      console.log('Service Worker: Background sync triggered')
    );
  }
});

// Message handler for cache clearing
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log('Service Worker: Force clearing cache', cacheName);
            return caches.delete(cacheName);
          })
        );
      }).then(() => {
        event.ports[0].postMessage({ success: true });
      })
    );
  }
});

// Push notification support (for future features)
self.addEventListener('push', (event) => {
  if (event.data) {
    const options = {
      body: event.data.text(),
      icon: '/assets/icons/icon-192x192.png',
      badge: '/assets/icons/badge-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      }
    };

    event.waitUntil(
      self.registration.showNotification('File Converter', options)
    );
  }
});
