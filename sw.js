const CACHE_NAME = 'vfx-sheet-v124';
const APP_SHELL = [
  './index.html',
  './css/app.css',
  './js/config.js',
  './js/app-shell.js',
  './js/bootstrap.js',
  './js/state.js',
  './js/utils.js',
  './js/database.js',
  './js/default-settings.js',
  './js/form-ui.js',
  './js/shot-thumbnails.js',
  './js/gps.js',
  './js/preset-normalizers.js',
  './js/preset-store.js',
  './js/preset-actions.js',
  './js/preset-modal.js',
  './js/media-modals.js',
  './js/record-thumbnails.js',
  './js/camera-model.js',
  './js/camera-tabs-state.js',
  './js/camera-tabs-interactions.js',
  './js/preset-options.js',
  './js/canvas-history.js',
  './js/canvas-style.js',
  './js/canvas-mode.js',
  './js/canvas-images.js',
  './js/record-modal.js',
  './js/record-flow.js',
  './js/record-save.js',
  './js/record-selection.js',
  './js/export-naming.js',
  './js/record-load.js',
  './js/thumbnail-collage.js',
  './js/zip-utils.js',
  './js/shooting-data-pdf.js',
  './js/canvas-actions.js',
  './manifest.webmanifest',
  './icon.svg',
  './icon-180.png',
  './icon-512.png',
  './vendor/tailwindcss.js',
  './vendor/dexie.js',
  './vendor/fabric.min.js',
  './vendor/jspdf.umd.min.js',
  './vendor/jspdf.plugin.autotable.min.js',
  './vendor/japanese-pdf-font.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone();
    if (new URL(event.request.url).origin === self.location.origin) caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match('./index.html'))));
});
