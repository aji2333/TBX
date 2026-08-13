const CACHE = 'qrcode-v3';
const ASSETS = [
    './',
    'index.html',
    'style.css',
    'src/js/app.js',
    'src/js/state.js',
    'src/js/api.js',
    'src/js/store.js',
    'src/js/utils.js',
    'src/js/ui.js',
    'qrcode.min.js'
];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(k => k !== CACHE).map(k => caches.delete(k))
        ))
    );
    self.clients.claim();
});

self.addEventListener('fetch', e => {
    e.respondWith(
        caches.match(e.request).then(r => r || fetch(e.request))
    );
});
