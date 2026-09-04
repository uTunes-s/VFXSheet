// Loading persisted records into the VFX Sheet editor.
import { db } from './database.js';
import { state } from './state.js';
import { getRecordShotThumbnails } from './export-naming.js';
import { captureRecordDraft, openEditRecordModal } from './record-modal.js';
import { getCameraReelPrefix, createEmptyCameraItem } from './camera-model.js';
import { renderCameraTabs } from './camera-tabs-renderer.js';
import { clearShotThumbnail, renderShotThumbnailPreviews } from './shot-thumbnails.js';
import { toggleHdriWeather, setWeatherValues } from './form-ui.js';
import { setCanvasMode } from './canvas-mode.js';
import { saveCanvasState, updateUndoRedoButtons } from './canvas-history.js';
import { cachedCamPresets, cachedLensPresets, cachedMovementPresets } from './preset-store.js';

function restorePresetSelection(value, isCustom, presets, fallback = '') {
  const savedValue = value || fallback;
  if (isCustom === true || (savedValue && !presets.some(preset => preset.name === savedValue))) {
    return { preset: '__custom__', custom: savedValue };
  }
  return { preset: savedValue, custom: '' };
}

export async function loadRecordForEdit(id, duplicate = false) {
  const record = await db.sheets.get(id);
  if (!record) return alert('Record not found.');

  state.isConfiguringAddDefaults = false;
  state.recordDraftBeforeHistoryEdit = duplicate ? null : captureRecordDraft();
  state.currentEditingId = duplicate ? null : id;
  openEditRecordModal(!duplicate);
  document.getElementById('editRecordModalTitle').innerText = duplicate ? 'Duplicate VFX Sheet' : 'Edit VFX Sheet';

  document.getElementById('editModeBanner').classList.toggle('hidden', duplicate);
  document.getElementById('editingRecordId').innerText = duplicate ? '-' : id;

  if (!duplicate) {
    document.getElementById('submitBtnContainer').innerHTML = '';
  } else {
    document.getElementById('submitBtnContainer').innerHTML = `<button type="submit" id="mainSubmitBtn" class="w-full bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold py-4 rounded-xl text-base transition-colors shadow-lg">Save VFX Sheet (IndexedDB)</button>`;
  }

  document.getElementById('operator').value = record.operator || '';
  document.getElementById('show_title').value = record.show_title || '';
  document.getElementById('shoot_datetime').value = record.shoot_datetime || '';
  document.getElementById('location').value = record.location || '';
  document.getElementById('gps_location').value = record.gps_location || '';
  document.getElementById('episode').value = record.episode || '';
  document.getElementById('scene').value = record.scene || '';
  document.getElementById('shot').value = record.shot || '';

  const isHdri = record.hdri_captured === 'YES' || record.hdri_captured === true;
  document.getElementById('hdri_captured').checked = isHdri;
  toggleHdriWeather(isHdri);
  setWeatherValues(record.hdri_weather || ['Sunny']);
  document.getElementById('hdri_notes').value = record.hdri_notes || '';

  if (record.cameras && record.cameras.length > 0) {
    state.cameraListState = record.cameras.map(c => {
      const camera = restorePresetSelection(c.camera, c.camera_is_custom, cachedCamPresets);
      const lens = restorePresetSelection(c.lens, c.lens_is_custom, cachedLensPresets);
      const cramerawork = restorePresetSelection(c.cramerawork, c.cramerawork_is_custom, cachedMovementPresets, 'Fix');
      return {
        label: c.label,
        reel_name: c.reel_name || getCameraReelPrefix(c.label),
        camera_preset: camera.preset,
        camera_custom: camera.custom,
        lens_preset: lens.preset,
        lens_custom: lens.custom,
        focal_length: c.focal_length || '',
        t_stop: c.t_stop || '',
        clip_name: c.clip_name || '',
        lut_info: c.lut_info || '',
        cramerawork_preset: cramerawork.preset,
        cramerawork_custom: cramerawork.custom,
        height_value: c.height_value || '',
        distance_value: c.distance_value || '',
        tilt_value: c.tilt_value || '',
        flag_chart: c.flag_chart || 'NO',
        flag_cleanplate: c.flag_cleanplate || 'NO',
        flag_reference: c.flag_reference || 'NO'
      };
    });
  } else {
    state.cameraListState = [createEmptyCameraItem('A')];
  }
  state.activeCamIndex = 0;
  renderCameraTabs();

  document.getElementById('notes').value = record.notes || '';
  clearShotThumbnail();
  state.pendingShotThumbnails = getRecordShotThumbnails(record);
  renderShotThumbnailPreviews();

  state.isUndoRedo = true;
  state.fCanvas.clear();
  if (record.canvas_json) {
    state.fCanvas.loadFromJSON(record.canvas_json, () => {
      state.fCanvas.renderAll();
      setCanvasMode('select');
      state.canvasHistory = [record.canvas_json];
      state.historyIndex = 0;
      state.isUndoRedo = false;
      state.isEditorDirty = false;
      updateUndoRedoButtons();
    });
  } else {
    state.fCanvas.setBackgroundColor('#090d16', () => {
      state.fCanvas.renderAll();
      state.canvasHistory = [];
      state.historyIndex = -1;
      state.isUndoRedo = false;
      saveCanvasState();
      state.isEditorDirty = false;
    });
  }

  document.getElementById('editRecordModalContent').scrollTo({ top: 0, behavior: 'smooth' });
}

