/**
 * Service Worker for File Converter PWA
 * Provides offline functionality and asset caching
 */

const CACHE_NAME = 'file-converter-v1.0.0';
const STATIC_CACHE = 'static-cache-v1.0.0';

// Assets to cache for offline functionality
const STATIC_ASSETS = [
  '/',
  '/pages/index.html',
  '/pages/converters/png-to-jpeg.html',
  '/pages/converters/gif-to-webm.html',
  '/pages/converters/png-icons.html',
  '/pages/converters/png-stickers.html',
  '/assets/styles/styles.css',
  '/assets/scripts/core/logger.js',
  '/assets/scripts/core/theme-switcher.js',
  '/assets/scripts/converters/png-converter.js',
  '/assets/scripts/converters/png-icons.js',
  '/assets/scripts/converters/png-stickers.js',
  '/manifest.json'
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
              return caches.match('/pages/index.html');
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
