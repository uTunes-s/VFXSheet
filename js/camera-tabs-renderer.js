// Camera tab header rendering. The tab form renderer remains globally available.
function renderCameraTabs() {
  const initialSettingStates = isConfiguringAddDefaults ? getVisibleInitialSettingStates() : null;
  const header = document.getElementById('cameraTabHeader');
  const addButton = header.querySelector('button[onclick="addCameraTab()"]');
  header.querySelectorAll('.cam-tab-btn').forEach(element => element.remove());
  cameraListState.forEach((camera, index) => {
    const isActive = index === activeCamIndex;
    const tabButton = document.createElement('div');
    tabButton.className = `cam-tab-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors border ${isActive ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800'}`;
    tabButton.onclick = () => switchCameraTab(index);
    tabButton.innerHTML = `<span>${getCameraReelName(camera)}</span><button type="button" data-action="edit-camera-reel-name" data-camera-index="${index}" class="rounded border border-current/30 px-1 text-[10px] hover:bg-black/10">Edit</button>${cameraListState.length > 1 ? `<button type="button" data-action="remove-camera" data-camera-index="${index}" class="hover:text-rose-300 font-bold ml-1">✕</button>` : ''}`;
    header.insertBefore(tabButton, addButton);
  });
  renderCameraTabContent();
  if (initialSettingStates) showInitialSettingToggles(initialSettingStates);
}
