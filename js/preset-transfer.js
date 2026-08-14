// Import and export the complete preset catalog and current defaults.
import { db } from './database.js';
import { state } from './state.js';
import { downloadExportBlob } from './media-utils.js';
import { initPresets } from './preset-store.js';

export async function exportFullPresetsJSON() {
  saveActiveTabState();
  const allPresets = await db.presets.toArray();
  const exportData = {
    app: 'VFX_Sheet',
    version: 10,
    exported_at: new Date().toISOString(),
    presets: allPresets,
    current_defaults: {
      operator: document.getElementById('operator').value,
      show_title: document.getElementById('show_title').value,
      location: document.getElementById('location').value,
      hdri_captured: document.getElementById('hdri_captured').checked,
      hdri_weather: getWeatherValues(),
      hdri_notes: document.getElementById('hdri_notes').value,
      cameras: state.cameraListState
    }
  };
  downloadExportBlob(new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' }), `VFX_Sheet_Presets_${new Date().toISOString().slice(0, 10)}.json`);
}

export async function importFullPresetsJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async loadEvent => {
    try {
      const data = JSON.parse(loadEvent.target.result);
      if (data.app !== 'VFX_Sheet' || !data.presets) throw new Error('Invalid preset JSON file format.');
      for (const preset of data.presets) await db.presets.put(preset);
      if (data.current_defaults) await db.presets.put({ type: 'user_defaults', values: data.current_defaults });
      await initPresets();
      await loadDefaultSettings();
      renderPresetModalLists();
      alert('Presets imported successfully!');
    } catch (error) {
      alert(`Import Error: ${error.message}`);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

Object.assign(globalThis, { exportFullPresetsJSON, importFullPresetsJSON });
