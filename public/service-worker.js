const CACHE_NAME = 'web3-stream-v2';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/favicon.ico',
    '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(name => name !== CACHE_NAME)
                        .map(name => caches.delete(name))
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', event => {
    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    // Network-first strategy for API calls
    if (event.request.url.includes('/api/')) {
        return networkFirstStrategy(event);
    }

    // Cache-first strategy for static assets
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetchAndCache(event.request))
    );
});

// Network-first strategy
function networkFirstStrategy(event) {
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Clone the response before using it
                const clonedResponse = response.clone();

                // Cache the response for future use
                caches.open(CACHE_NAME)
                    .then(cache => cache.put(event.request, clonedResponse));

                return response;
            })
            .catch(() => {
                // If network fails, try the cache
                return caches.match(event.request);
            })
    );
}

// Fetch and cache function
async function fetchAndCache(request) {
    const response = await fetch(request);

    // Cache successful responses
    if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
    }

    return response;
}
