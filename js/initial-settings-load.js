// Load saved sheet defaults into the current editor form.
import { db } from './database.js';
import { state } from './state.js';
import { getCurrentDefaultSettingsValues, getDefaultSettingsChangeSummary } from './initial-settings-comparison.js';
import { toggleHdriWeather, setWeatherValues } from './form-ui.js';
import { renderCameraTabs } from './camera-tabs-renderer.js';

export async function loadDefaultSettings() {
  const defaultSettings = await db.presets.get('user_defaults');
  if (!defaultSettings || !defaultSettings.values) {
    alert('No saved default settings found.');
    return;
  }
  const values = defaultSettings.values;
  const currentValues = getCurrentDefaultSettingsValues();
  const changes = getDefaultSettingsChangeSummary(currentValues, values);
  if (changes === 'No changes') {
    alert('The current form matches the saved default settings.');
    return;
  }
  if (!confirm(`Fields that will change when loaded:\n${changes}\n\nLoad the saved default settings?`)) return;

  document.getElementById('operator').value = values.operator || '';
  document.getElementById('show_title').value = values.show_title || '';
  document.getElementById('location').value = values.location || '';
  document.getElementById('hdri_captured').checked = values.hdri_captured || false;
  toggleHdriWeather(values.hdri_captured || false);
  setWeatherValues(values.hdri_weather || ['Sunny']);
  document.getElementById('hdri_notes').value = values.hdri_notes || '';

  if (values.cameras && values.cameras.length > 0) state.cameraListState = values.cameras.map(camera => ({ ...camera }));
  state.activeCamIndex = 0;
  renderCameraTabs();
  alert('Default settings loaded!');
}

