// Camera tab lifecycle and form-to-state synchronization.
import { state } from './state.js';
import { createEmptyCameraItem, getCameraReelName } from './camera-model.js';

export function addCameraTab() {
  saveActiveTabState();
  const label = String.fromCharCode(65 + state.cameraListState.length);
  state.cameraListState.push(createEmptyCameraItem(label));
  state.activeCamIndex = state.cameraListState.length - 1;
  renderCameraTabs();
}

export function removeCameraTab(index, event) {
  event.stopPropagation();
  if (state.cameraListState.length <= 1) return alert('At least one camera entry is required.');
  if (!confirm(`Delete ${state.cameraListState[index].label}?`)) return;
  state.cameraListState.splice(index, 1);
  state.activeCamIndex = Math.min(state.activeCamIndex, state.cameraListState.length - 1);
  renderCameraTabs();
}

export function switchCameraTab(index) {
  saveActiveTabState();
  state.activeCamIndex = index;
  renderCameraTabs();
}

export function editCameraReelName(index, event) {
  event.stopPropagation();
  saveActiveTabState();
  const camera = state.cameraListState[index];
  const name = prompt('Enter the camera/reel name.', getCameraReelName(camera));
  if (name === null) return;
  const reelName = name.trim().toUpperCase();
  if (!reelName) return alert('Enter a reel name.');
  camera.label = reelName;
  camera.reel_name = reelName;
  renderCameraTabs();
}

export function saveActiveTabState() {
  if (!state.cameraListState[state.activeCamIndex]) return;
  const value = id => document.getElementById(id)?.value || '';
  const checked = id => document.getElementById(id)?.checked ? 'YES' : 'NO';
  const current = state.cameraListState[state.activeCamIndex];
  state.cameraListState[state.activeCamIndex] = {
    label: current.label,
    reel_name: current.reel_name || current.label,
    camera_preset: value('tab_camera_preset'), camera_custom: value('tab_camera_custom'),
    lens_preset: value('tab_lens_preset'), lens_custom: value('tab_lens_custom'),
    focal_length: value('tab_focal_length'), t_stop: value('tab_t_stop'),
    clip_name: value('tab_clip_name'), lut_info: value('tab_lut_info'),
    cramerawork_preset: document.getElementById('tab_cramerawork_preset')?.value ?? '',
    cramerawork_custom: value('tab_cramerawork_custom'), height_value: value('tab_height_value'),
    distance_value: value('tab_distance_value'), tilt_value: value('tab_tilt_value'),
    flag_chart: checked('tab_flag_chart'), flag_cleanplate: checked('tab_flag_cleanplate'), flag_reference: checked('tab_flag_reference')
  };
}

Object.assign(globalThis, { addCameraTab, removeCameraTab, switchCameraTab, editCameraReelName, saveActiveTabState });
