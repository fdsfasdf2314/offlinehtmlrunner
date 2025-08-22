const CACHE_NAME = 'html-runner-offline-v2';
const urlsToCache = [
  './',
  './index.html',
  './3.14.17.js',
  './sw.js'
];

// Install event - cache all resources
self.addEventListener('install', event => {
  console.log('Service Worker: Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: All files cached successfully');
        // Force the waiting service worker to become the active service worker
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('Service Worker: Cache failed:', err);
      })
  );
});

// Activate event - clean up old caches and take control
self.addEventListener('activate', event => {
  console.log('Service Worker: Activate event');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache first, fallback to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Return cached version if available
        if (cachedResponse) {
          console.log('Service Worker: Serving from cache:', event.request.url);
          return cachedResponse;
        }

        // If not in cache, try to fetch from network
        console.log('Service Worker: Fetching from network:', event.request.url);
        return fetch(event.request)
          .then(response => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response for caching
            const responseToCache = response.clone();

            // Add to cache for future use
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(err => {
            console.log('Service Worker: Network fetch failed:', err);
            
            // If it's a navigation request and we're offline, show offline page
            if (event.request.destination === 'document') {
              return new Response(
                `<!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Offline - HTML File Runner</title>
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            min-height: 100vh;
                            margin: 0;
                            background: #f3f4f6;
                            color: #374151;
                            text-align: center;
                            padding: 20px;
                        }
                        .offline-container {
                            max-width: 400px;
                            background: white;
                            padding: 40px;
                            border-radius: 12px;
                            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                        }
                        .offline-icon {
                            font-size: 48px;
                            margin-bottom: 16px;
                        }
                        h1 {
                            margin: 0 0 16px 0;
                            color: #1f2937;
                        }
                        p {
                            margin: 0 0 24px 0;
                            color: #6b7280;
                            line-height: 1.5;
                        }
                        button {
                            background: #5D5CDE;
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 8px;
                            cursor: pointer;
                            font-size: 16px;
                            transition: background 0.2s;
                        }
                        button:hover {
                            background: #4c4bca;
                        }
                        @media (prefers-color-scheme: dark) {
                            body {
                                background: #111827;
                                color: #e5e7eb;
                            }
                            .offline-container {
                                background: #1f2937;
                            }
                            h1 {
                                color: #f9fafb;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="offline-container">
                        <div class="offline-icon">📱</div>
                        <h1>You're Offline</h1>
                        <p>The HTML File Runner is cached and should work offline. Please try refreshing the page.</p>
                        <button onclick="window.location.reload()">Refresh Page</button>
                    </div>
                </body>
                </html>`,
                {
                  headers: {
                    'Content-Type': 'text/html',
                    'Cache-Control': 'no-cache'
                  }
                }
              );
            }
            
            // For other requests, just throw the error
            throw err;
          });
      })
  );
});

// Handle messages from the main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
