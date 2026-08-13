// Loading persisted records into the VFX Sheet editor.
async function loadRecordForEdit(id, duplicate = false) {
  const record = await db.sheets.get(id);
  if (!record) return alert('Record not found.');

  isConfiguringAddDefaults = false;
  recordDraftBeforeHistoryEdit = duplicate ? null : captureRecordDraft();
  currentEditingId = duplicate ? null : id;
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
    cameraListState = record.cameras.map(c => ({
      label: c.label,
      reel_name: c.reel_name || getCameraReelPrefix(c.label),
      camera_preset: c.camera || '',
      camera_custom: '',
      lens_preset: c.lens || '',
      lens_custom: '',
      focal_length: c.focal_length || '',
      t_stop: c.t_stop || '',
      clip_name: c.clip_name || '',
      lut_info: c.lut_info || '',
      cramerawork_preset: c.cramerawork || 'Fix',
      cramerawork_custom: '',
      height_value: c.height_value || '',
      distance_value: c.distance_value || '',
      tilt_value: c.tilt_value || '',
      flag_chart: c.flag_chart || 'NO',
      flag_cleanplate: c.flag_cleanplate || 'NO',
      flag_reference: c.flag_reference || 'NO'
    }));
  } else {
    cameraListState = [createEmptyCameraItem('A')];
  }
  activeCamIndex = 0;
  renderCameraTabs();

  document.getElementById('notes').value = record.notes || '';
  clearShotThumbnail();
  pendingShotThumbnails = getRecordShotThumbnails(record);
  renderShotThumbnailPreviews();

  isUndoRedo = true;
  fCanvas.clear();
  if (record.canvas_json) {
    fCanvas.loadFromJSON(record.canvas_json, () => {
      fCanvas.renderAll();
      setCanvasMode('select');
      canvasHistory = [record.canvas_json];
      historyIndex = 0;
      isUndoRedo = false;
      updateUndoRedoButtons();
    });
  } else {
    fCanvas.setBackgroundColor('#090d16', () => {
      fCanvas.renderAll();
      canvasHistory = [];
      historyIndex = -1;
      isUndoRedo = false;
      saveCanvasState();
    });
  }

  document.getElementById('editRecordModalContent').scrollTo({ top: 0, behavior: 'smooth' });
}
