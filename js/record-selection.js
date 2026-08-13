// Record history selection and deletion controls.
function updateHistorySelectionControls(records = []) {
  const selectedCount = selectedRecordIds.size;
  const deleteButton = document.getElementById('deleteSelectedBtn');
  const selectAllButton = document.getElementById('selectAllRecordsBtn');
  deleteButton.disabled = selectedCount === 0;
  deleteButton.innerText = `Delete Selected (${selectedCount})`;
  selectAllButton.innerText = records.length && selectedCount === records.length ? 'Clear Selection' : 'Select All';
}

function toggleRecordSelection(id, isSelected) {
  if (isSelected) selectedRecordIds.add(id);
  else selectedRecordIds.delete(id);
  renderList();
}

async function toggleSelectAllRecords() {
  const records = await db.sheets.toArray();
  if (records.length && selectedRecordIds.size === records.length) selectedRecordIds.clear();
  else records.forEach(record => selectedRecordIds.add(record.id));
  renderList();
}

async function getRecordsForHistoryAction() {
  const records = await db.sheets.reverse().toArray();
  return selectedRecordIds.size ? records.filter(record => selectedRecordIds.has(record.id)) : records;
}

async function deleteSelectedRecords() {
  const ids = [...selectedRecordIds];
  if (!ids.length || !confirm(`Delete ${ids.length} selected record(s)? This action cannot be undone.`)) return;
  await db.sheets.bulkDelete(ids);
  if (currentEditingId && ids.includes(currentEditingId)) closeEditRecordModal();
  selectedRecordIds.clear();
  renderList();
}

async function deleteRecord(id) {
  if (!confirm(`Delete Record ID: ${id}?`)) return;
  await db.sheets.delete(id);
  if (currentEditingId === id) cancelEditMode();
  renderList();
}
