// Reset a new record editor to the configured sheet defaults.
import { db } from './database.js';
import { state } from './state.js';
import { getInitialSettingEnabledFields } from './default-settings.js';
import { createEmptyCameraItem, getCameraReelName } from './camera-model.js';
import { normalizeReel } from './clip-names.js';
import { renderShotThumbnailPreviews } from './shot-thumbnails.js';
import { toggleHdriWeather, setWeatherValues } from './form-ui.js';
import { setCanvasMode } from './canvas-mode.js';
import { renderCameraTabs } from './camera-tabs-renderer.js';

export async function resetFormToDefault() {
  const session = state.editorSession;
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('shoot_datetime').value = now.toISOString().slice(0, 16);

  const defaultSettings = await db.presets.get('user_defaults');
  if (session !== state.editorSession) return;
  if (defaultSettings?.values) {
    const values = defaultSettings.values;
    const enabled = getInitialSettingEnabledFields(values);
    if (enabled.operator) document.getElementById('operator').value = values.operator || '';
    if (enabled.show_title) document.getElementById('show_title').value = values.show_title || '';
    if (enabled.location) document.getElementById('location').value = values.location || '';
    if (enabled.shoot_datetime) document.getElementById('shoot_datetime').value = values.shoot_datetime || document.getElementById('shoot_datetime').value;
    if (enabled.episode) document.getElementById('episode').value = values.episode || '';
    if (enabled.scene) document.getElementById('scene').value = values.scene || '';
    if (enabled.shot) document.getElementById('shot').value = values.shot || '';
    if (enabled.reel) document.getElementById('reel').value = normalizeReel(values.reel);
    if (enabled.gps_location) document.getElementById('gps_location').value = values.gps_location || '';
    if (enabled.notes) document.getElementById('notes').value = values.notes || '';
    if (enabled.shot_thumbnails) {
      state.pendingShotThumbnails = [...(values.shot_thumbnails || [])];
      renderShotThumbnailPreviews();
    }
    document.getElementById('hdri_captured').checked = enabled.hdri && (values.hdri_captured || false);
    toggleHdriWeather(enabled.hdri && (values.hdri_captured || false));
    setWeatherValues(enabled.hdri ? (values.hdri_weather || []) : []);
    document.getElementById('hdri_notes').value = enabled.hdri ? (values.hdri_notes || '') : '';

    const cameraFields = ['reel_name', 'camera_preset', 'lens_preset', 'focal_length', 't_stop', 'shutter_speed', 'frame_rate', 'iso_ei', 'white_balance', 'nd_filter', 'codec', 'clip_name', 'lut_info', 'cramerawork_preset', 'height_value', 'distance_value', 'tilt_value', 'reference_flags'];
    const hasCameraSpecificSettings = Object.keys(values.enabled_fields || {}).some(key => /^camera_\d+_/.test(key));
    const isCameraFieldEnabled = (index, key) => {
      const saved = values.enabled_fields?.[`camera_${index}_${key}`];
      if (saved !== undefined) return Boolean(saved);
      if (key === 'reel_name') return Boolean(values.cameras[index].reel_name || values.cameras[index].label);
      return hasCameraSpecificSettings ? false : Boolean(enabled[key]);
    };
    const selectedCameras = (values.cameras || []).map((camera, index) => ({ camera, index })).filter(({ index }) => state.isConfiguringAddDefaults || cameraFields.some(key => isCameraFieldEnabled(index, key)));
    if (selectedCameras.length) {
      state.cameraListState = selectedCameras.map(({ camera, index }) => {
        const fallback = createEmptyCameraItem(String.fromCharCode(65 + index));
        const result = { ...fallback, ...camera, reel_name: getCameraReelName(camera) };
        if (state.isConfiguringAddDefaults) return result;
        cameraFields.forEach(key => {
          if (isCameraFieldEnabled(index, key)) return;
          if (key === 'reference_flags') {
            result.flag_chart = fallback.flag_chart;
            result.flag_cleanplate = fallback.flag_cleanplate;
            result.flag_reference = fallback.flag_reference;
            result.chart_clip_name = fallback.chart_clip_name;
            result.cleanplate_clip_name = fallback.cleanplate_clip_name;
            result.reference_clip_name = fallback.reference_clip_name;
          } else result[key] = fallback[key];
        });
        if (!isCameraFieldEnabled(index, 'reel_name')) result.label = fallback.label;
        return result;
      });
    } else state.cameraListState = [createEmptyCameraItem('A')];

    if (enabled.sketch && values.canvas_json && state.fCanvas) state.fCanvas.loadFromJSON(values.canvas_json, () => { state.fCanvas.renderAll(); setCanvasMode('select'); });
  } else {
    state.cameraListState = [createEmptyCameraItem('A')];
    document.getElementById('hdri_captured').checked = false;
    toggleHdriWeather(false);
  }
  state.activeCamIndex = 0;
  renderCameraTabs();
}
