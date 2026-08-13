// Record validation, normalization, and IndexedDB persistence.
function getSavedCameras() {
  return cameraListState.map(camera => ({
    label: camera.label,
    reel_name: camera.reel_name || getCameraReelPrefix(camera.label),
    camera: camera.camera_preset === '__custom__' ? camera.camera_custom : camera.camera_preset,
    lens: camera.lens_preset === '__custom__' ? camera.lens_custom : camera.lens_preset,
    focal_length: camera.focal_length,
    t_stop: camera.t_stop,
    clip_name: camera.clip_name,
    lut_info: camera.lut_info,
    cramerawork: camera.cramerawork_preset === '__custom__' ? camera.cramerawork_custom : camera.cramerawork_preset,
    height_value: camera.height_value,
    distance_value: camera.distance_value,
    tilt_value: camera.tilt_value,
    flag_chart: camera.flag_chart,
    flag_cleanplate: camera.flag_cleanplate,
    flag_reference: camera.flag_reference
  }));
}

async function saveRecord(event, mode) {
  event?.preventDefault();
  const form = document.getElementById('vfxForm');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  saveActiveTabState();

  const isUpdate = mode === 'update' && currentEditingId;
  const existingRecord = isUpdate ? await db.sheets.get(currentEditingId) : null;
  const isHdri = document.getElementById('hdri_captured').checked;
  const canvasBlob = await exportCanvasToBlob();
  const currentThumbnails = pendingShotThumbnails.length
    ? pendingShotThumbnails
    : existingRecord?.shot_thumbnails || (existingRecord?.shot_thumbnail ? [existingRecord.shot_thumbnail] : []);

  const field = id => document.getElementById(id).value;
  const payload = {
    operator: field('operator'), show_title: field('show_title'), shoot_datetime: field('shoot_datetime'),
    location: field('location'), gps_location: field('gps_location'), episode: field('episode'),
    scene: field('scene'), shot: field('shot'), hdri_captured: isHdri ? 'YES' : 'NO',
    hdri_weather: isHdri ? getWeatherValues() : [], hdri_notes: isHdri ? field('hdri_notes') : '',
    cameras: getSavedCameras(), notes: field('notes'), images: [canvasBlob],
    shot_thumbnails: currentThumbnails,
    canvas_json: JSON.stringify(fCanvas.toJSON(['isSketchStroke', 'isSketchRaster'])),
    canvas_version: 5, uuid: isUpdate ? existingRecord.uuid : newUuid(),
    synced: 0, syncError: '', created_at: new Date().toISOString()
  };

  try {
    if (isUpdate) {
      await db.sheets.update(currentEditingId, payload);
      alert(`Record ID: ${currentEditingId} updated.`);
    } else {
      const id = await db.sheets.add(payload);
      alert(`Saved as new record (ID: ${id}).`);
    }
  } catch (error) {
    console.error('Save Record Error:', error);
    alert('Failed to save record to IndexedDB.');
    return;
  }

  if (isEditingInModal) {
    recordDraftBeforeHistoryEdit = null;
    closeEditRecordModal();
  } else {
    prepareNextRecord();
  }
  await renderList();
}
