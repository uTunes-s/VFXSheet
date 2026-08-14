// Editor reset and next-record preparation.
import { state } from './state.js';
import { incrementTrailingNumber } from './utils.js';
import { resetFormToDefault } from './initial-settings-reset.js';
import { clearShotThumbnail } from './shot-thumbnails.js';
import { clearNoteCanvas } from './canvas-actions.js';
import { setCanvasMode } from './canvas-mode.js';
import { saveActiveTabState } from './camera-tabs-state.js';
import { getCameraReelPrefix } from './camera-model.js';
import { renderCameraTabs } from './camera-tabs-renderer.js';

export function setNewRecordSubmitButton() {
  document.getElementById('submitBtnContainer').innerHTML = '<button type="submit" id="mainSubmitBtn" class="w-full bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold py-4 rounded-xl text-base transition-colors shadow-lg">Save VFX Sheet (IndexedDB)</button>';
}

export function cancelEditMode() {
  state.currentEditingId = null;
  document.getElementById('editModeBanner').classList.add('hidden');
  setNewRecordSubmitButton();
  document.getElementById('vfxForm').reset();
  resetFormToDefault();
  clearShotThumbnail();
  clearNoteCanvas();
  setCanvasMode('draw');
}

export function prepareNextRecord() {
  state.currentEditingId = null;
  document.getElementById('editModeBanner').classList.add('hidden');
  setNewRecordSubmitButton();
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('shoot_datetime').value = now.toISOString().slice(0, 16);
  document.getElementById('shot').value = incrementTrailingNumber(document.getElementById('shot').value);
  saveActiveTabState();
  state.cameraListState = state.cameraListState.map(camera => ({
    ...camera,
    reel_name: camera.reel_name || getCameraReelPrefix(camera.label),
    lens_preset: '', lens_custom: '', focal_length: '', t_stop: '',
    cramerawork_preset: '', cramerawork_custom: '', height_value: '',
    distance_value: '', tilt_value: '', clip_name: incrementTrailingNumber(camera.clip_name)
  }));
  state.activeCamIndex = 0;
  renderCameraTabs();
  clearShotThumbnail();
}

Object.assign(globalThis, { setNewRecordSubmitButton, cancelEditMode, prepareNextRecord });
