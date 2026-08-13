// Preset modal visibility and refresh behavior.
function openPresetModal() {
  renderPresetModalLists();
  renderAddDefaultsSummary();
  document.getElementById('presetModal').classList.remove('hidden');
}

function closePresetModal() {
  document.getElementById('presetModal').classList.add('hidden');
}
