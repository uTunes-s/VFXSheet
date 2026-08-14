// Camera tab header rendering. The tab form renderer remains globally available.
import { state } from './state.js';
import { getCameraReelName } from './camera-model.js';
import { getVisibleInitialSettingStates, showInitialSettingToggles } from './initial-settings-ui.js';
import { renderCameraTabContent } from './camera-tab-content-renderer.js';

export function renderCameraTabs() {
  const initialSettingStates = state.isConfiguringAddDefaults ? getVisibleInitialSettingStates() : null;
  const header = document.getElementById('cameraTabHeader');
  const addButton = header.querySelector('[data-action="add-camera"]');
  header.querySelectorAll('.cam-tab-btn').forEach(element => element.remove());
  state.cameraListState.forEach((camera, index) => {
    const isActive = index === state.activeCamIndex;
    const tabButton = document.createElement('div');
    tabButton.className = `cam-tab-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors border ${isActive ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800'}`;
    tabButton.dataset.action = 'switch-camera';
    tabButton.dataset.cameraIndex = index;
    tabButton.innerHTML = `<span>${getCameraReelName(camera)}</span><button type="button" data-action="edit-camera-reel-name" data-camera-index="${index}" class="rounded border border-current/30 px-1 text-[10px] hover:bg-black/10">Edit</button>${state.cameraListState.length > 1 ? `<button type="button" data-action="remove-camera" data-camera-index="${index}" class="hover:text-rose-300 font-bold ml-1">✕</button>` : ''}`;
    header.insertBefore(tabButton, addButton);
  });
  renderCameraTabContent();
  if (initialSettingStates) showInitialSettingToggles(initialSettingStates);
}

