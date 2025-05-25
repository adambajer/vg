const CACHE_NAME = 'gif-carousel-cache-v1';
const urlsToCache = [
    './',
    './index.html',
    './main.js',
    './manifest.webmanifest',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/annyang/2.6.1/annyang.min.js'
    // Přidejte cesty k ikonám, až je vytvoříte
    // './icons/icon-192x192.png',
    // './icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', (event) => {
    // Pro Giphy API volání nebudeme používat cache, protože data jsou dynamická
    if (event.request.url.includes('api.giphy.com')) {
        return fetch(event.request); // Vždy jdi na síť
    }

    // Pro ostatní požadavky (HTML, CSS, JS, ikony) použij cache-first strategii
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - vrátit z cache
                if (response) {
                    return response;
                }
                // Cache miss - jít na síť
                return fetch(event.request);
            })
    );
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName); // Odstraň staré cache
                    }
                })
            );
        })
    );
});