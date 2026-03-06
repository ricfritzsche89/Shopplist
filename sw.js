const CACHE_NAME = 'shopplist-v9';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/style.css',
    './js/app.js',
    './js/db.js',
    './manifest.json',
    './assets/icon.svg'
];

// Install Event - Caching Assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then((cache) => cache.addAll(ASSETS_TO_CACHE))
        .then(() => self.skipWaiting())
    );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

// Fetch Event - Network first for Supabase, Cache First for assets
self.addEventListener('fetch', (event) => {
    // Falls es ein API Request zu Supabase ist -> Network Only / Net First
    if (event.request.url.includes('supabase.co')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // Static Assets -> Cache First, fallback to Network
    event.respondWith(
        caches.match(event.request)
        .then((response) => response || fetch(event.request))
    );
});
