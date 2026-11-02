// Camera tab preset-selection interactions.
export function onTabPresetChange(type, preset) {
  const custom = preset.closest('.camera-card').querySelector(`[data-camera-field="${type}_custom"]`);
  if (preset.value === '__custom__') {
    custom.classList.remove('hidden');
    preset.classList.replace('w-full', 'w-1/2');
    custom.classList.add('w-1/2');
  } else {
    custom.classList.add('hidden');
    preset.classList.replace('w-1/2', 'w-full');
  }
}

export function onTabLensChange(preset) {
  onTabPresetChange('lens', preset);
  const focalInput = preset.closest('.camera-card').querySelector('[data-camera-field="focal_length"]');
  const focal = preset.options[preset.selectedIndex].getAttribute('data-focal');
  if (focal && preset.value !== '__custom__') {
    focalInput.value = focal;
    focalInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
}
