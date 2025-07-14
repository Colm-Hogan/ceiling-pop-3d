const CACHE_NAME = 'ceiling-pop-3d-v1.0.0';
const CACHE_URLS = [
  '/',
  '/index.html',
  '/style.css',
  '/manifest.json',
  '/js/main.js',
  '/js/game-state.js',
  '/js/game-objects.js',
  '/js/scene-manager.js',
  '/js/audio-manager.js',
  '/js/utils.js',
  '/icons/favicon.ico',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // External CDN resources
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/tone/14.7.77/Tone.js',
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap',
  'https://fonts.gstatic.com/s/orbitron/v29/yMJMMIlzdpvBhQQL_SC3X9yhF25-T1nyGy6BoWgmRD2z6U1jR1x7.woff2'
];

// Install event - cache resources
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching files');
        return cache.addAll(CACHE_URLS);
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('Service Worker: Installation failed', err);
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
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

// Fetch event - serve from cache with fallback strategies
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version if available
        if (response) {
          console.log('Service Worker: Serving from cache:', event.request.url);
          return response;
        }

        // Otherwise fetch from network
        console.log('Service Worker: Fetching from network:', event.request.url);
        return fetch(event.request)
          .then(response => {
            // Check if response is valid
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response for caching
            const responseToCache = response.clone();

            // Determine if we should cache this resource
            const shouldCache = shouldCacheResource(event.request.url);
            
            if (shouldCache) {
              caches.open(CACHE_NAME)
                .then(cache => {
                  console.log('Service Worker: Caching new resource:', event.request.url);
                  cache.put(event.request, responseToCache);
                })
                .catch(err => {
                  console.warn('Service Worker: Failed to cache resource:', err);
                });
            }

            return response;
          })
          .catch(err => {
            console.error('Service Worker: Network fetch failed:', err);
            
            // For navigation requests, return a generic offline page
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            
            // For other requests, just throw the error
            throw err;
          });
      })
  );
});

// Helper function to determine what resources to cache
function shouldCacheResource(url) {
  // Cache game assets, fonts, and CDN resources
  const cacheablePatterns = [
    /\.(js|css|html|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/,
    /fonts\.googleapis\.com/,
    /fonts\.gstatic\.com/,
    /cdnjs\.cloudflare\.com/
  ];

  return cacheablePatterns.some(pattern => pattern.test(url));
}

// Handle background sync for potential offline analytics or updates
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('Service Worker: Background sync triggered');
    event.waitUntil(doBackgroundSync());
  }
});

// Background sync function (placeholder for future features)
function doBackgroundSync() {
  return Promise.resolve()
    .then(() => {
      console.log('Service Worker: Background sync completed');
    })
    .catch(err => {
      console.error('Service Worker: Background sync failed:', err);
    });
}

// Push notification handler (for future features)
self.addEventListener('push', event => {
  if (!event.data) {
    return;
  }

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const url = event.notification.data.url || '/';
  
  event.waitUntil(
    clients.openWindow(url)
  );
});

// Performance monitoring
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});