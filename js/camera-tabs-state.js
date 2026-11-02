// Camera card lifecycle and camera-scoped form-to-state synchronization.
import { state } from './state.js';
import { createEmptyCameraItem, getCameraReelName, referenceClipFields } from './camera-model.js';
import { renderCameraTabs } from './camera-tabs-renderer.js';
import { getVisibleInitialSettingStates, markInitialSettingEnabled } from './initial-settings-ui.js';

export function addCameraTab() {
  saveActiveTabState();
  let number = state.cameraListState.length;
  while (state.cameraListState.some(camera => camera.label === String.fromCharCode(65 + number))) number++;
  const label = String.fromCharCode(65 + number);
  state.cameraListState.push(createEmptyCameraItem(label));
  renderCameraTabs();
  state.isEditorDirty = true;
  document.querySelector('.camera-card:last-child')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

export function removeCameraTab(index, event) {
  event.stopPropagation();
  if (state.cameraListState.length <= 1) return alert('At least one camera entry is required.');
  if (!confirm(`Delete ${state.cameraListState[index].label}?`)) return;
  saveActiveTabState();
  const enabled = state.isConfiguringAddDefaults ? getVisibleInitialSettingStates() : null;
  const remapped = enabled && Object.fromEntries(Object.entries(enabled).flatMap(([key, value]) => {
    const match = key.match(/^camera_(\d+)_(.+)$/);
    if (!match) return [[key, value]];
    const oldIndex = Number(match[1]);
    return oldIndex === index ? [] : [[`camera_${oldIndex > index ? oldIndex - 1 : oldIndex}_${match[2]}`, value]];
  }));
  if (remapped) state.initialSettingToggleStates = remapped;
  state.cameraListState.splice(index, 1);
  renderCameraTabs(remapped);
  state.isEditorDirty = true;
}

export function editCameraReelName(index, event) {
  event?.stopPropagation();
  saveActiveTabState();
  const camera = state.cameraListState[index];
  const name = prompt('Enter the camera/reel name.', getCameraReelName(camera));
  if (name === null) return;
  const reelName = name.trim().toUpperCase();
  if (!reelName) return alert('Enter a reel name.');
  camera.label = reelName;
  camera.reel_name = reelName;
  markInitialSettingEnabled(`camera_${index}_reel_name`);
  renderCameraTabs();
  state.isEditorDirty = true;
}

export function saveActiveTabState() {
  document.querySelectorAll('.camera-card [data-camera-field]').forEach(syncCameraField);
}

export function syncCameraField(input) {
  const card = input.closest('.camera-card');
  const camera = card && state.cameraListState[Number(card.dataset.cameraIndex)];
  if (!camera || !input.dataset.cameraField) return;
  camera[input.dataset.cameraField] = input.type === 'checkbox' ? (input.checked ? 'YES' : 'NO') : input.value;
  if (input.dataset.cameraField === 'reel_name') {
    camera.reel_name = input.value.trim().toUpperCase();
    camera.label = camera.reel_name;
  }
  const key = input.dataset.cameraField;
  if (referenceClipFields[key]) {
    const enabled = camera[key] === 'YES';
    card.querySelector(`[data-reference-toggle-for="${key}"]`).hidden = enabled;
    const wrapper = card.querySelector(`[data-reference-clip-for="${key}"]`);
    wrapper.hidden = !enabled;
    if (!enabled) {
      wrapper.querySelector('.camera-setting-popover').classList.add('hidden');
      wrapper.querySelector('input').setAttribute('aria-expanded', 'false');
    }
  }
}
