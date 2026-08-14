const CACHE_NAME = 'vfx-sheet-v162';
const APP_SHELL = [
  './index.html',
  './css/app.css',
  './js/config.js',
  './js/app-shell.js',
  './js/main.js',
  './js/state.js',
  './js/utils.js',
  './js/database.js',
  './js/default-settings.js',
  './js/event-delegation.js',
  './js/form-ui.js',
  './js/shot-thumbnails.js',
  './js/gps.js',
  './js/preset-catalog-meta.js',
  './js/preset-catalog-cameras.js',
  './js/preset-catalog-lenses.js',
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
  './js/flowpt-export.js',
  './js/media-utils.js',
  './js/backup.js',
  './js/sync.js',
  './js/canvas-eraser.js',
  './js/canvas-core.js',
  './js/canvas-crop.js',
  './js/initial-settings-ui.js',
  './js/pdf-canvas-utils.js',
  './js/preset-transfer.js',
  './js/initial-settings-transfer.js',
  './js/initial-settings-comparison.js',
  './js/initial-settings-load.js',
  './js/initial-settings-reset.js',
  './js/initial-settings-editor.js',
  './js/pdf-text-layer.js',
  './js/pdf-text-record.js',
  './js/pdf-page-renderer.js',
  './js/preset-list-renderer.js',
  './js/camera-tabs-renderer.js',
  './js/camera-tab-content-renderer.js',
  './js/record-preview.js',
  './js/pdf-print-record.js',
  './js/record-list-renderer.js',
  './js/pdf-print-export.js',
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
