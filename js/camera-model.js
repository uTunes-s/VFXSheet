// Camera-tab data model and display naming helpers.
export function createEmptyCameraItem(label) {
  return {
    label,
    reel_name: getCameraReelPrefix(label),
    camera_preset: '',
    camera_custom: '',
    lens_preset: '',
    lens_custom: '',
    focal_length: '',
    t_stop: '',
    shutter_speed: '',
    frame_rate: '',
    iso_ei: '',
    white_balance: '',
    nd_filter: '',
    codec: '',
    clip_name: '',
    lut_info: '',
    cramerawork_preset: '',
    cramerawork_custom: '',
    height_value: '',
    distance_value: '',
    tilt_value: '',
    flag_chart: 'NO',
    flag_cleanplate: 'NO',
    flag_reference: 'NO',
    chart_clip_name: '',
    cleanplate_clip_name: '',
    reference_clip_name: ''
  };
}

export function getCameraReelPrefix(label) {
  const letters = String(label || '').match(/[A-Za-z]/g);
  return letters ? letters[letters.length - 1].toUpperCase() : 'A';
}

export function getCameraReelName(camera) {
  return String(camera?.reel_name || camera?.label || 'A').replace(/^Cam\s*/i, '').trim().toUpperCase() || 'A';
}

export function getCameraFieldLabel(camera) {
  return getCameraReelName(camera);
}

export const referenceClipFields = {
  flag_chart: 'chart_clip_name',
  flag_cleanplate: 'cleanplate_clip_name',
  flag_reference: 'reference_clip_name'
};

export function getReferenceFlagText(camera, flagKey) {
  const flag = camera[flagKey] || 'NO';
  const clip = String(camera[referenceClipFields[flagKey]] || '').trim();
  return flag === 'YES' && clip ? `YES (${clip})` : flag;
}
