// Preset modal visibility and refresh behavior.
import { renderPresetModalLists } from './preset-list-renderer.js';
import { renderAddDefaultsSummary } from './initial-settings-transfer.js';

export function openPresetModal() {
  renderPresetModalLists();
  renderAddDefaultsSummary();
  document.getElementById('presetModal').classList.remove('hidden');
}

export function closePresetModal() {
  document.getElementById('presetModal').classList.add('hidden');
}

Object.assign(globalThis, { openPresetModal, closePresetModal });
