// ES module application entry point. It coordinates the remaining classic
// feature scripts while they are migrated one feature group at a time.
import './app-shell.js';
import { initEventDelegation } from './event-delegation.js';

const CLASSIC_ASSETS = [
  '../vendor/tailwindcss.js',
  '../vendor/dexie.js',
  '../vendor/fabric.min.js',
  '../vendor/jspdf.umd.min.js',
  '../vendor/jspdf.plugin.autotable.min.js',
  '../vendor/japanese-pdf-font.js',
  './state.js', './utils.js', './database.js', './default-settings.js', './form-ui.js', './shot-thumbnails.js', './gps.js',
  './preset-catalog-meta.js', './preset-catalog-cameras.js', './preset-catalog-lenses.js', './preset-normalizers.js', './preset-store.js', './preset-actions.js', './preset-modal.js', './media-modals.js', './record-thumbnails.js', './camera-model.js', './camera-tabs-state.js', './camera-tabs-interactions.js', './preset-options.js',
  './canvas-history.js', './canvas-style.js', './canvas-mode.js', './canvas-images.js', './record-modal.js', './record-flow.js', './record-save.js', './record-selection.js', './export-naming.js', './record-load.js', './thumbnail-collage.js', './zip-utils.js', './shooting-data-pdf.js', './flowpt-export.js', './media-utils.js', './backup.js', './sync.js', './canvas-eraser.js', './canvas-core.js', './canvas-crop.js',
  './initial-settings-ui.js', './initial-settings-transfer.js', './initial-settings-comparison.js', './initial-settings-load.js', './initial-settings-reset.js', './initial-settings-editor.js', './preset-list-renderer.js', './camera-tabs-renderer.js', './camera-tab-content-renderer.js', './record-preview.js', './record-list-renderer.js', './pdf-print-record.js', './pdf-print-export.js', './pdf-text-layer.js', './pdf-text-record.js', './pdf-page-renderer.js', './pdf-canvas-utils.js', './preset-transfer.js', './canvas-actions.js'
];

function loadClassicScript(source) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL(source, import.meta.url).href;
    script.async = false;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Unable to load ${source}`));
    document.head.append(script);
  });
}

for (const source of CLASSIC_ASSETS) await loadClassicScript(source);

initEventDelegation();
await initPresets();
await resetFormToDefault();
initFabricCanvas();
renderList();
switchAppPage('history');
