// Compare the active form with saved sheet default settings.
function getCurrentDefaultSettingsValues() {
  saveActiveTabState();
  return {
    operator: document.getElementById('operator').value,
    show_title: document.getElementById('show_title').value,
    location: document.getElementById('location').value,
    hdri_captured: document.getElementById('hdri_captured').checked,
    hdri_weather: getWeatherValues(),
    hdri_notes: document.getElementById('hdri_notes').value,
    cameras: cameraListState
  };
}

function getDefaultSettingsChangeSummary(currentValues, newValues, includeUnchanged = false) {
  const fields = [
    ['operator', 'Operator'],
    ['show_title', 'Show / Title'],
    ['location', 'Location'],
    ['hdri_captured', 'HDRI Captured'],
    ['hdri_weather', 'HDRI Weather'],
    ['hdri_notes', 'HDRI Notes'],
    ['cameras', 'Camera / Reel Settings']
  ];
  const changedFields = fields
    .filter(([key]) => includeUnchanged || JSON.stringify(currentValues?.[key] ?? null) !== JSON.stringify(newValues?.[key] ?? null))
    .map(([, label]) => `• ${label}`);
  return changedFields.length ? changedFields.join('\n') : 'No changes';
}
