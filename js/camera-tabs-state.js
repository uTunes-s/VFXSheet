// Camera tab lifecycle and form-to-state synchronization.
function addCameraTab() {
  saveActiveTabState();
  const label = String.fromCharCode(65 + cameraListState.length);
  cameraListState.push(createEmptyCameraItem(label));
  activeCamIndex = cameraListState.length - 1;
  renderCameraTabs();
}

function removeCameraTab(index, event) {
  event.stopPropagation();
  if (cameraListState.length <= 1) return alert('At least one camera entry is required.');
  if (!confirm(`Delete ${cameraListState[index].label}?`)) return;
  cameraListState.splice(index, 1);
  activeCamIndex = Math.min(activeCamIndex, cameraListState.length - 1);
  renderCameraTabs();
}

function switchCameraTab(index) {
  saveActiveTabState();
  activeCamIndex = index;
  renderCameraTabs();
}

function editCameraReelName(index, event) {
  event.stopPropagation();
  saveActiveTabState();
  const camera = cameraListState[index];
  const name = prompt('Enter the camera/reel name.', getCameraReelName(camera));
  if (name === null) return;
  const reelName = name.trim().toUpperCase();
  if (!reelName) return alert('Enter a reel name.');
  camera.label = reelName;
  camera.reel_name = reelName;
  renderCameraTabs();
}

function saveActiveTabState() {
  if (!cameraListState[activeCamIndex]) return;
  const value = id => document.getElementById(id)?.value || '';
  const checked = id => document.getElementById(id)?.checked ? 'YES' : 'NO';
  const current = cameraListState[activeCamIndex];
  cameraListState[activeCamIndex] = {
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
