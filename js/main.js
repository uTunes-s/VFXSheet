// ES module application entry point. It coordinates the remaining classic
// feature scripts while they are migrated one feature group at a time.
import './app-shell.js';
import { initEventDelegation } from './event-delegation.js';
import './utils.js';
import './state.js';
import './media-utils.js';
import './export-naming.js';
import './preset-catalog-meta.js';
import './preset-catalog-cameras.js';
import './preset-catalog-lenses.js';

const CLASSIC_ASSETS = [
  '../vendor/tailwindcss.js',
  '../vendor/dexie.js',
  '../vendor/fabric.min.js',
  '../vendor/jspdf.umd.min.js',
  '../vendor/jspdf.plugin.autotable.min.js',
  '../vendor/japanese-pdf-font.js',
  './default-settings.js', './form-ui.js', './shot-thumbnails.js', './gps.js',
  './media-modals.js', './record-thumbnails.js', './camera-tabs-interactions.js',
  './canvas-history.js', './canvas-style.js', './canvas-mode.js', './canvas-images.js', './thumbnail-collage.js', './zip-utils.js', './shooting-data-pdf.js', './flowpt-export.js', './backup.js', './sync.js', './canvas-eraser.js', './canvas-core.js', './canvas-crop.js',
  './initial-settings-ui.js', './initial-settings-transfer.js', './initial-settings-comparison.js', './initial-settings-load.js', './initial-settings-reset.js', './initial-settings-editor.js', './camera-tabs-renderer.js', './camera-tab-content-renderer.js', './pdf-print-record.js', './pdf-print-export.js', './pdf-text-layer.js', './pdf-text-record.js', './pdf-page-renderer.js', './pdf-canvas-utils.js', './canvas-actions.js'
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

await import('./database.js');
const { initPresets } = await import('./preset-store.js');
await import('./preset-actions.js');
await import('./preset-modal.js');
await import('./preset-options.js');
await import('./preset-list-renderer.js');
await import('./preset-transfer.js');
await import('./record-selection.js');
await import('./record-flow.js');
await import('./record-modal.js');
await import('./record-load.js');
await import('./record-save.js');
await import('./record-list-renderer.js');
await import('./record-preview.js');
await import('./camera-model.js');
await import('./camera-tabs-state.js');
for (const source of CLASSIC_ASSETS) await loadClassicScript(source);

initEventDelegation();
await initPresets();
await resetFormToDefault();
initFabricCanvas();
renderList();
switchAppPage('history');
