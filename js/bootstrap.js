// Starts feature modules after the legacy feature bundle has defined its APIs.
// This remains a classic script temporarily because the feature bundle is still
// being migrated from global functions to ES module exports.
document.addEventListener('DOMContentLoaded', async () => {
  await initPresets();
  await resetFormToDefault();
  initFabricCanvas();
  renderList();
  switchAppPage('history');
});
