// Preset modal visibility and refresh behavior.
export function openPresetModal() {
  renderPresetModalLists();
  renderAddDefaultsSummary();
  document.getElementById('presetModal').classList.remove('hidden');
}

export function closePresetModal() {
  document.getElementById('presetModal').classList.add('hidden');
}

Object.assign(globalThis, { openPresetModal, closePresetModal });
