// Sheet-default predicates. Kept separate from the modal and form rendering code.
import { initialSettingItems } from './state.js';

export function getInitialSettingEnabledFields(values = {}) {
  const saved = values.enabled_fields || {};
  return Object.fromEntries(initialSettingItems.map(([key]) => [key, saved[key] ?? hasSavedInitialValue(values, key)]));
}

export function hasSavedInitialValue(values, key) {
  if (key === 'hdri') return Boolean(values.hdri_captured || values.hdri_notes || values.hdri_weather?.length);
  if (key === 'shot_thumbnails') return Boolean((values.shot_thumbnails || []).length);
  if (key === 'sketch') {
    try { return Boolean(JSON.parse(values.canvas_json || '{}').objects?.length); }
    catch { return false; }
  }
  const cameraKeys = ['camera_preset', 'lens_preset', 'focal_length', 't_stop', 'clip_name', 'lut_info', 'cramerawork_preset', 'height_value', 'distance_value', 'tilt_value', 'reference_flags'];
  if (cameraKeys.includes(key)) {
    return Boolean((values.cameras || []).some(camera => key === 'reference_flags'
      ? camera.flag_chart === 'YES' || camera.flag_cleanplate === 'YES' || camera.flag_reference === 'YES'
      : camera[key]));
  }
  return Boolean(values[key]);
}

