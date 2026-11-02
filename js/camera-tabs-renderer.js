// All cameras stay visible to make the destination of every input explicit.
import { state } from './state.js';
import { getVisibleInitialSettingStates, showInitialSettingToggles } from './initial-settings-ui.js';
import { renderCameraContent } from './camera-tab-content-renderer.js';
import { refreshClipNameSuggestions } from './clip-names.js';

export function renderCameraTabs(initialSettingStates = state.isConfiguringAddDefaults ? getVisibleInitialSettingStates() : null) {
  document.getElementById('cameraCards').innerHTML = state.cameraListState.map((camera, index) => `
    <section class="camera-card bg-slate-950" data-camera-index="${index}" aria-labelledby="camera_${index}_heading">
      ${renderCameraContent(camera, index)}
    </section>`).join('');
  if (initialSettingStates) showInitialSettingToggles(initialSettingStates);
  refreshClipNameSuggestions();
}
