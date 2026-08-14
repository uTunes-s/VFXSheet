// ES module application entry point. Vendor globals load before feature modules.
import './app-shell.js';
import { initEventDelegation } from './event-delegation.js';
import './utils.js';
import './state.js';
import './media-utils.js';
import './export-naming.js';
import './preset-catalog-meta.js';
import './preset-catalog-cameras.js';
import './preset-catalog-lenses.js';

const VENDOR_ASSETS = [
  '../vendor/tailwindcss.js',
  '../vendor/dexie.js',
  '../vendor/fabric.min.js',
  '../vendor/jspdf.umd.min.js',
  '../vendor/jspdf.plugin.autotable.min.js',
  '../vendor/japanese-pdf-font.js'
];

function loadVendorScript(source) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL(source, import.meta.url).href;
    script.async = false;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Unable to load ${source}`));
    document.head.append(script);
  });
}

for (const source of VENDOR_ASSETS) await loadVendorScript(source);
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
await import('./camera-tabs-interactions.js');
await import('./camera-tabs-renderer.js');
await import('./camera-tab-content-renderer.js');
await import('./default-settings.js');
await import('./initial-settings-comparison.js');
await import('./initial-settings-load.js');
await import('./initial-settings-reset.js');
await import('./initial-settings-ui.js');
await import('./initial-settings-editor.js');
await import('./initial-settings-transfer.js');
await import('./canvas-style.js');
await import('./canvas-history.js');
await import('./canvas-mode.js');
await import('./canvas-images.js');
await import('./form-ui.js');
await import('./shot-thumbnails.js');
await import('./gps.js');
await import('./media-modals.js');
await import('./record-thumbnails.js');
await import('./canvas-actions.js');
await import('./canvas-eraser.js');
await import('./canvas-core.js');
await import('./zip-utils.js');
await import('./thumbnail-collage.js');
await import('./backup.js');
await import('./sync.js');
await import('./pdf-canvas-utils.js');
await import('./pdf-text-layer.js');
await import('./pdf-page-renderer.js');
await import('./shooting-data-pdf.js');
await import('./flowpt-export.js');
await import('./pdf-text-record.js');
await import('./pdf-print-record.js');
await import('./pdf-print-export.js');

initEventDelegation();
await initPresets();
await resetFormToDefault();
initFabricCanvas();
renderList();
switchAppPage('history');
