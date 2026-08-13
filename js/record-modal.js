// Record editor modal lifecycle.
async function openNewRecordModal() {
  isConfiguringAddDefaults = false;
  currentEditingId = null;
  recordDraftBeforeHistoryEdit = null;
  document.getElementById('vfxForm').reset();
  clearShotThumbnail();
  clearNoteCanvas();
  await resetFormToDefault();
  setCanvasMode('draw');
  document.getElementById('submitBtnContainer').innerHTML = '<button type="submit" id="mainSubmitBtn" class="w-full bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold py-4 rounded-xl text-base transition-colors shadow-lg">Save VFX Sheet (IndexedDB)</button>';
  openEditRecordModal(false);
  document.getElementById('editRecordModalTitle').innerText = 'New VFX Sheet';
  document.getElementById('editRecordModalContent').scrollTo({ top: 0, behavior: 'smooth' });
}

function openEditRecordModal(showActions = true) {
  const modal = document.getElementById('editRecordModal');
  const form = document.getElementById('vfxForm');
  document.getElementById('editRecordModalContent').appendChild(form);
  modal.classList.remove('hidden');
  document.getElementById('editRecordModalActions').classList.toggle('hidden', !showActions);
  document.getElementById('editRecordModalActions').classList.toggle('flex', showActions);
  isEditingInModal = true;
  document.body.classList.add('overflow-hidden');
}

function closeEditRecordModal() {
  if (!isEditingInModal) return;
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
  isEditingInModal = false;
  document.body.classList.remove('overflow-hidden');
  document.getElementById('editRecordModalTitle').innerText = 'Edit VFX Sheet';
  isConfiguringAddDefaults = false;
  if (currentEditingId && recordDraftBeforeHistoryEdit) {
    restoreRecordDraft(recordDraftBeforeHistoryEdit);
    recordDraftBeforeHistoryEdit = null;
  } else if (currentEditingId) {
    cancelEditMode();
  }
}
