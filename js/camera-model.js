// Camera-tab data model and display naming helpers.
function createEmptyCameraItem(label) {
  return {
    label,
    reel_name: getCameraReelPrefix(label),
    camera_preset: '',
    camera_custom: '',
    lens_preset: '',
    lens_custom: '',
    focal_length: '',
    t_stop: '',
    clip_name: '',
    lut_info: '',
    cramerawork_preset: '',
    cramerawork_custom: '',
    height_value: '',
    distance_value: '',
    tilt_value: '',
    flag_chart: 'NO',
    flag_cleanplate: 'NO',
    flag_reference: 'NO'
  };
}

function getCameraReelPrefix(label) {
  const letters = String(label || '').match(/[A-Za-z]/g);
  return letters ? letters[letters.length - 1].toUpperCase() : 'A';
}

function getCameraReelName(camera) {
  return String(camera?.reel_name || camera?.label || 'A').replace(/^Cam\s*/i, '').trim().toUpperCase() || 'A';
}

function getCameraFieldLabel(camera) {
  return `Cam ${getCameraReelName(camera)}`;
}
