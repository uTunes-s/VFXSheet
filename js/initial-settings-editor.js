// Sheet-default editor open and save workflows.
import { db } from './database.js';
import { state } from './state.js';
import { getInitialSettingEnabledFields } from './default-settings.js';
import { getDefaultSettingsChangeSummary } from './initial-settings-comparison.js';
import { getVisibleInitialSettingStates, showInitialSettingToggles } from './initial-settings-ui.js';
import { saveActiveTabState } from './camera-tabs-state.js';
import { getWeatherValues, switchAppPage } from './form-ui.js';
import { clearShotThumbnail } from './shot-thumbnails.js';
import { clearNoteCanvas } from './canvas-actions.js';
import { setCanvasMode } from './canvas-mode.js';
import { openEditRecordModal, closeEditRecordModal } from './record-modal.js';
import { resetFormToDefault } from './initial-settings-reset.js';

export async function saveCurrentAsDefaultSettings() {
  saveActiveTabState();
  const defaultValues = {
    operator: document.getElementById('operator').value,
    show_title: document.getElementById('show_title').value,
    location: document.getElementById('location').value,
    shoot_datetime: document.getElementById('shoot_datetime').value,
    episode: document.getElementById('episode').value,
    scene: document.getElementById('scene').value,
    shot: document.getElementById('shot').value,
    gps_location: document.getElementById('gps_location').value,
    hdri_captured: document.getElementById('hdri_captured').checked,
    hdri_weather: getWeatherValues(),
    hdri_notes: document.getElementById('hdri_notes').value,
    notes: document.getElementById('notes').value,
    shot_thumbnails: [...state.pendingShotThumbnails],
    canvas_json: state.fCanvas ? JSON.stringify(state.fCanvas.toJSON(['isSketchStroke', 'isSketchRaster'])) : '',
    cameras: state.cameraListState
  };
  defaultValues.enabled_fields = state.isConfiguringAddDefaults
    ? getVisibleInitialSettingStates()
    : getInitialSettingEnabledFields((await db.presets.get('user_defaults'))?.values);

  const existingDefaults = await db.presets.get('user_defaults');
  const action = existingDefaults?.values ? 'Overwrite' : 'Save';
  if (!confirm(`${action} sheet defaults:\n${getDefaultSettingsChangeSummary(existingDefaults?.values, defaultValues, true)}\n\nUse these values for future new sheets?`)) return;
  await db.presets.put({ type: 'user_defaults', values: defaultValues });
  await renderAddDefaultsSummary();
  alert('Sheet defaults saved.');
  if (state.isConfiguringAddDefaults) {
    closeEditRecordModal();
    switchAppPage('history');
  }
}

export async function openAddDefaultsEditor() {
  state.isConfiguringAddDefaults = true;
  document.getElementById('editRecordModal').classList.add('initial-settings-modal');
  state.currentEditingId = null;
  state.recordDraftBeforeHistoryEdit = null;
  openEditRecordModal(false);
  document.getElementById('editRecordModalTitle').innerText = 'Sheet Defaults';
  document.getElementById('initialSettingsModalActions').classList.remove('hidden');
  document.getElementById('initialSettingsModalActions').classList.add('flex');
  document.getElementById('editRecordModalContent').scrollTo({ top: 0, behavior: 'smooth' });

  document.getElementById('vfxForm').reset();
  clearShotThumbnail();
  clearNoteCanvas();
  await resetFormToDefault();
  setCanvasMode('draw');
  const savedValues = (await db.presets.get('user_defaults'))?.values || {};
  state.initialSettingToggleStates = { ...getInitialSettingEnabledFields(savedValues), ...(savedValues.enabled_fields || {}) };
  showInitialSettingToggles(state.initialSettingToggleStates);
  document.getElementById('submitBtnContainer').innerHTML = '';
}

