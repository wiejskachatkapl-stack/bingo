const CACHE_NAME = 'bingo-v1006-cache';
const FILES = [
  './',
  './index.html?v=1006',
  './style.css?v=1006',
  './app.js?v=1006',
  './manifest.json',
  './assets/images/bingo_start.png',
  './assets/images/bingo_game_bg.png',
  './assets/icons/icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(FILES)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(()=>{});
      return response;
    }).catch(() => caches.match(event.request))
  );
});
