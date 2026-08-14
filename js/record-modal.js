// Record editor modal lifecycle.
import { state } from './state.js';
import { resetFormToDefault } from './initial-settings-reset.js';
import { clearShotThumbnail, renderShotThumbnailPreviews } from './shot-thumbnails.js';
import { clearNoteCanvas } from './canvas-actions.js';
import { setCanvasMode } from './canvas-mode.js';
import { saveActiveTabState } from './camera-tabs-state.js';
import { renderCameraTabs } from './camera-tabs-renderer.js';
import { toggleHdriWeather } from './form-ui.js';
import { cancelEditMode } from './record-flow.js';

export async function openNewRecordModal() {
  state.isConfiguringAddDefaults = false;
  state.currentEditingId = null;
  state.recordDraftBeforeHistoryEdit = null;
  openEditRecordModal(false);
  document.getElementById('editRecordModalTitle').innerText = 'New VFX Sheet';
  document.getElementById('editRecordModalContent').scrollTo({ top: 0, behavior: 'smooth' });

  document.getElementById('vfxForm').reset();
  clearShotThumbnail();
  clearNoteCanvas();
  await resetFormToDefault();
  setCanvasMode('draw');
  document.getElementById('submitBtnContainer').innerHTML = '<button type="submit" id="mainSubmitBtn" class="w-full bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold py-4 rounded-xl text-base transition-colors shadow-lg">Save VFX Sheet (IndexedDB)</button>';
}

export function openEditRecordModal(showActions = true) {
  const modal = document.getElementById('editRecordModal');
  const form = document.getElementById('vfxForm');
  document.getElementById('editRecordModalContent').appendChild(form);
  modal.classList.remove('hidden');
  document.getElementById('editRecordModalActions').classList.toggle('hidden', !showActions);
  document.getElementById('editRecordModalActions').classList.toggle('flex', showActions);
  state.isEditingInModal = true;
  document.body.classList.add('overflow-hidden');
}

export function closeEditRecordModal() {
  if (!state.isEditingInModal) return;
  const form = document.getElementById('vfxForm');
  form.classList.remove('configuring-initial-settings');
  form.querySelectorAll('.initial-setting-control').forEach(control => control.remove());
  document.getElementById('recordPage').appendChild(form);
  document.getElementById('editRecordModal').classList.add('hidden');
  document.getElementById('editRecordModal').classList.remove('initial-settings-modal');
  for (const id of ['initialSettingsModalActions', 'editRecordModalActions']) {
    document.getElementById(id).classList.add('hidden');
    document.getElementById(id).classList.remove('flex');
  }
  state.isEditingInModal = false;
  document.body.classList.remove('overflow-hidden');
  document.getElementById('editRecordModalTitle').innerText = 'Edit VFX Sheet';
  state.isConfiguringAddDefaults = false;
  if (state.currentEditingId && state.recordDraftBeforeHistoryEdit) {
    restoreRecordDraft(state.recordDraftBeforeHistoryEdit);
    state.recordDraftBeforeHistoryEdit = null;
  } else if (state.currentEditingId) {
    cancelEditMode();
  }
}

export function captureRecordDraft() {
  saveActiveTabState();
  const formValues = {};
  document.querySelectorAll('#vfxForm input:not([type="file"]), #vfxForm textarea, #vfxForm select').forEach(element => {
    if (!element.id) return;
    formValues[element.id] = element.tagName === 'SELECT' && element.multiple
      ? [...element.selectedOptions].map(option => option.value)
      : element.type === 'checkbox' ? element.checked : element.value;
  });
  return { formValues, cameras: state.cameraListState.map(camera => ({ ...camera })), activeCamIndex: state.activeCamIndex, thumbnails: [...state.pendingShotThumbnails], canvasJson: state.fCanvas ? JSON.stringify(state.fCanvas.toJSON(['isSketchStroke', 'isSketchRaster'])) : '' };
}

export function restoreRecordDraft(draft) {
  state.currentEditingId = null;
  document.getElementById('editModeBanner').classList.add('hidden');
  document.getElementById('submitBtnContainer').innerHTML = '<button type="submit" id="mainSubmitBtn" class="w-full bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold py-4 rounded-xl text-base transition-colors shadow-lg">Save VFX Sheet (IndexedDB)</button>';
  Object.entries(draft.formValues).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (!element) return;
    if (element.tagName === 'SELECT' && element.multiple) {
      const selected = new Set(value);
      [...element.options].forEach(option => { option.selected = selected.has(option.value); });
    } else if (element.type === 'checkbox') element.checked = value;
    else element.value = value;
  });
  toggleHdriWeather(document.getElementById('hdri_captured').checked);
  state.cameraListState = draft.cameras.map(camera => ({ ...camera }));
  state.activeCamIndex = Math.min(draft.activeCamIndex, Math.max(0, state.cameraListState.length - 1));
  state.pendingShotThumbnails = [...draft.thumbnails];
  renderCameraTabs();
  renderShotThumbnailPreviews();
  if (draft.canvasJson && state.fCanvas) state.fCanvas.loadFromJSON(draft.canvasJson, () => { state.fCanvas.renderAll(); setCanvasMode('select'); });
}

