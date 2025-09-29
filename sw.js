/**
 * Service Worker for File Converter PWA
 * 
 * PROFESSIONAL CACHING STRATEGY:
 * - Stale-while-revalidate for HTML (instant load + fresh updates)
 * - Cache-first for static assets with versioning (performance)
 * - Network-first for API calls (always fresh data)
 * - Automatic cache management (cleanup old versions)
 * 
 * Cache Lifetime Strategy:
 * - Short-lived: HTML, JSON (1 hour)
 * - Medium-lived: CSS, JS (24 hours with versioning)
 * - Long-lived: Images, fonts (30 days)
 */

const APP_VERSION = '2.1.0';
const CACHE_PREFIX = 'file-converter';
const STATIC_CACHE = `${CACHE_PREFIX}-static-v${APP_VERSION}`;
const DYNAMIC_CACHE = `${CACHE_PREFIX}-dynamic-v${APP_VERSION}`;
const HTML_CACHE = `${CACHE_PREFIX}-html-v${APP_VERSION}`;

// Assets categorized by caching strategy
const STATIC_ASSETS = [
  // Core PWA files (long-lived cache)
  '/manifest.json',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png',
  '/assets/icons/favicon-32x32.png',
  '/assets/icons/favicon-16x16.png',
  // CSS (medium-lived with versioning)
  '/assets/styles/styles.css'
];

const HTML_ASSETS = [
  '/',
  '/index.html',
  '/pages/converters/gif-to-webm.html',
  '/pages/converters/png-to-jpeg.html',
  '/pages/converters/png-icons.html',
  '/pages/converters/png-stickers.html',
  '/pages/converters/image-splitter.html',
  '/pages/converters/grid-generator.html'
];

// Cache durations (in milliseconds)
const CACHE_DURATION = {
  HTML: 1 * 60 * 60 * 1000,     // 1 hour
  STATIC: 30 * 24 * 60 * 60 * 1000, // 30 days
  DYNAMIC: 24 * 60 * 60 * 1000   // 24 hours
};

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log(`Service Worker v${APP_VERSION}: Installing...`);
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then(cache => {
        console.log('Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      }),
      // Pre-cache critical HTML
      caches.open(HTML_CACHE).then(cache => {
        console.log('Pre-caching HTML assets...');
        return cache.addAll(HTML_ASSETS);
      })
    ]).then(() => {
      console.log('Service Worker: Installation complete');
      return self.skipWaiting();
    }).catch((error) => {
      console.error('Service Worker: Installation failed', error);
    })
  );
});

// Activate event - clean up old caches automatically
self.addEventListener('activate', (event) => {
  console.log(`Service Worker v${APP_VERSION}: Activating...`);
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, HTML_CACHE];
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.startsWith(CACHE_PREFIX) && !currentCaches.includes(cacheName)) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients
      self.clients.claim()
    ]).then(() => {
      console.log('Service Worker: Activation complete');
    })
  );
});

// Professional fetch strategy with multiple caching patterns
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and external requests
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  const url = new URL(event.request.url);
  const pathname = url.pathname;

  // Determine resource type and caching strategy
  const isHTML = event.request.destination === 'document' || pathname.endsWith('.html');
  const isStaticAsset = pathname.includes('/assets/icons/') || pathname.includes('/manifest.json');
  const isCSS = pathname.endsWith('.css');
  const isJS = pathname.endsWith('.js');
  const hasVersionParam = url.searchParams.has('v') || url.searchParams.has('t');

  if (isHTML) {
    // Stale-while-revalidate for HTML (instant load + background update)
    event.respondWith(staleWhileRevalidate(event.request, HTML_CACHE));
  } else if (isStaticAsset) {
    // Cache-first for static assets (long-lived)
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
  } else if ((isCSS || isJS) && hasVersionParam) {
    // Cache-first for versioned resources (safe to cache aggressively)
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
  } else if (isCSS || isJS) {
    // Network-first for non-versioned CSS/JS (development flexibility)
    event.respondWith(networkFirst(event.request, DYNAMIC_CACHE));
  } else {
    // Default: stale-while-revalidate for other resources
    event.respondWith(staleWhileRevalidate(event.request, DYNAMIC_CACHE));
  }
});

// Caching strategies
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse && !isExpired(cachedResponse)) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return cachedResponse || new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  // Background update (don't await)
  const networkUpdate = fetch(request).then(response => {
    if (response.status === 200) {
      const cache = caches.open(cacheName);
      cache.then(c => c.put(request, response.clone()));
    }
    return response;
  }).catch(() => null);

  // Return cached version immediately, or wait for network if no cache
  return cachedResponse || networkUpdate;
}

// Check if cached response is expired
function isExpired(response) {
  const cachedDate = new Date(response.headers.get('date') || 0);
  const now = new Date();
  const maxAge = CACHE_DURATION.DYNAMIC; // Default expiry
  return (now - cachedDate) > maxAge;
}

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
