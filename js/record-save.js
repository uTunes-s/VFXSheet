// Record validation, normalization, and IndexedDB persistence.
import { db } from './database.js';
import { state } from './state.js';
import { newUuid } from './utils.js';
import { getCameraReelPrefix } from './camera-model.js';
import { saveActiveTabState } from './camera-tabs-state.js';
import { getWeatherValues } from './form-ui.js';
import { exportCanvasToBlob } from './canvas-actions.js';
import { closeEditRecordModal } from './record-modal.js';
import { prepareNextRecord } from './record-flow.js';
import { renderList } from './record-list-renderer.js';
import { copyImageBlob, imageFromBlob } from './media-utils.js';
import { normalizeReel } from './clip-names.js';

export function getSavedCameras() {
  return state.cameraListState.map(camera => ({
    label: camera.label,
    reel_name: camera.reel_name || getCameraReelPrefix(camera.label),
    camera: camera.camera_preset === '__custom__' ? camera.camera_custom : camera.camera_preset,
    camera_is_custom: camera.camera_preset === '__custom__',
    lens: camera.lens_preset === '__custom__' ? camera.lens_custom : camera.lens_preset,
    lens_is_custom: camera.lens_preset === '__custom__',
    focal_length: camera.focal_length,
    t_stop: camera.t_stop,
    shutter_speed: camera.shutter_speed,
    frame_rate: camera.frame_rate,
    iso_ei: camera.iso_ei,
    white_balance: camera.white_balance,
    nd_filter: camera.nd_filter,
    codec: camera.codec,
    clip_name: camera.clip_name,
    lut_info: camera.lut_info,
    cramerawork: camera.cramerawork_preset === '__custom__' ? camera.cramerawork_custom : camera.cramerawork_preset,
    cramerawork_is_custom: camera.cramerawork_preset === '__custom__',
    height_value: camera.height_value,
    distance_value: camera.distance_value,
    tilt_value: camera.tilt_value,
    flag_chart: camera.flag_chart,
    flag_cleanplate: camera.flag_cleanplate,
    flag_reference: camera.flag_reference,
    chart_clip_name: camera.chart_clip_name || '',
    cleanplate_clip_name: camera.cleanplate_clip_name || '',
    reference_clip_name: camera.reference_clip_name || ''
  }));
}

export async function saveRecord(event, mode) {
  event?.preventDefault();
  const form = document.getElementById('vfxForm');
  const reelInput = document.getElementById('reel');
  reelInput.value = normalizeReel(reelInput.value);
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  if (state.isSavingRecord) return;
  if (state.pendingThumbnailLoads) return alert('Please wait for the selected images to finish loading before saving.');
  saveActiveTabState();

  state.isSavingRecord = true;
  const editingId = state.currentEditingId;
  const isUpdate = mode === 'update' && editingId;
  const thumbnails = [...state.pendingShotThumbnails];
  const isHdri = document.getElementById('hdri_captured').checked;
  const field = id => document.getElementById(id).value;
  const payload = {
    operator: field('operator'), show_title: field('show_title'), shoot_datetime: field('shoot_datetime'),
    location: field('location'), gps_location: field('gps_location'), episode: field('episode'),
    scene: field('scene'), shot: field('shot'), reel: field('reel'), hdri_captured: isHdri ? 'YES' : 'NO',
    hdri_weather: isHdri ? getWeatherValues() : [], hdri_notes: isHdri ? field('hdri_notes') : '',
    cameras: getSavedCameras(), notes: field('notes'),
    shot_thumbnail: undefined,
    canvas_json: JSON.stringify(state.fCanvas.toJSON(['isSketchStroke', 'isSketchRaster'])),
    canvas_version: 5,
    synced: 0, syncError: '', created_at: new Date().toISOString()
  };
  form.inert = true;

  try {
    const canvasBlob = await exportCanvasToBlob();
    const existingRecord = isUpdate ? await db.sheets.get(editingId) : null;
    if (isUpdate && !existingRecord) throw new Error('Record no longer exists. Close the editor and reopen the record.');
    payload.uuid = isUpdate ? existingRecord.uuid : newUuid();
    payload.images = [canvasBlob];
    payload.shot_thumbnails = await Promise.all(thumbnails.map(async (image, index) => {
      const blob = await copyImageBlob(image, `Thumbnail ${index + 1}`);
      await imageFromBlob(blob, `Thumbnail ${index + 1}`);
      return blob;
    }));
    if (isUpdate) {
      await db.sheets.update(editingId, payload);
      alert(`Record ID: ${editingId} updated.`);
    } else {
      const id = await db.sheets.add(payload);
      alert(`Saved as new record (ID: ${id}).`);
    }
  } catch (error) {
    console.error('Save Record Error:', error);
    alert(`Failed to save record. ${error.message || 'Could not write to IndexedDB.'}`);
    return;
  } finally {
    state.isSavingRecord = false;
    form.inert = false;
  }

  if (state.isEditingInModal) {
    state.recordDraftBeforeHistoryEdit = null;
    closeEditRecordModal(true);
  } else {
    prepareNextRecord();
  }
  await renderList();
}
