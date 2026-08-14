// Camera tab preset-selection interactions.
export function onTabPresetChange(type) {
  const preset = document.getElementById(`tab_${type}_preset`);
  const custom = document.getElementById(`tab_${type}_custom`);
  if (preset.value === '__custom__') {
    custom.classList.remove('hidden');
    preset.classList.replace('w-full', 'w-1/2');
    custom.classList.add('w-1/2');
  } else {
    custom.classList.add('hidden');
    preset.classList.replace('w-1/2', 'w-full');
  }
}

export function onTabLensChange() {
  onTabPresetChange('lens');
  const preset = document.getElementById('tab_lens_preset');
  const focalInput = document.getElementById('tab_focal_length');
  const focal = preset.options[preset.selectedIndex].getAttribute('data-focal');
  if (focal && preset.value !== '__custom__') focalInput.value = focal;
}

Object.assign(globalThis, { onTabPresetChange, onTabLensChange });
