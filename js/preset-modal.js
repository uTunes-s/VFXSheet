// Preset modal visibility and refresh behavior.
import { renderPresetModalLists } from './preset-list-renderer.js';
import { renderAddDefaultsSummary } from './initial-settings-transfer.js';
import { populateFlowPtConnectionForm } from './flowpt-settings.js';

export function openPresetModal() {
  renderPresetModalLists();
  renderAddDefaultsSummary();
  populateFlowPtConnectionForm();
  document.getElementById('presetModal').classList.remove('hidden');
}

export function closePresetModal() {
  document.getElementById('presetModal').classList.add('hidden');
}

// Public APIs are exposed only through named ES module exports.

