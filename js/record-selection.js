// Record history selection and deletion controls.
import { db } from './database.js';
import { state } from './state.js';
import { renderList } from './record-list-renderer.js';
import { closeEditRecordModal } from './record-modal.js';
import { cancelEditMode } from './record-flow.js';
import { getVisibleRecords } from './record-list-filters.js';

export function updateHistorySelectionControls(records = []) {
  const selectedCount = state.selectedRecordIds.size;
  const selectedVisibleCount = records.filter(record => state.selectedRecordIds.has(record.id)).length;
  const deleteButton = document.getElementById('deleteSelectedBtn');
  const selectAllButton = document.getElementById('selectAllRecordsBtn');
  deleteButton.disabled = selectedCount === 0;
  deleteButton.innerText = `Delete Selected (${selectedCount})`;
  selectAllButton.innerText = records.length && selectedVisibleCount === records.length ? 'Clear Visible Selection' : 'Select All Visible';
}

export function toggleRecordSelection(id, isSelected) {
  if (isSelected) state.selectedRecordIds.add(id);
  else state.selectedRecordIds.delete(id);
  renderList();
}

export async function toggleSelectAllRecords() {
  const records = getVisibleRecords(await db.sheets.toArray());
  const allVisibleSelected = records.length && records.every(record => state.selectedRecordIds.has(record.id));
  if (allVisibleSelected) records.forEach(record => state.selectedRecordIds.delete(record.id));
  else records.forEach(record => state.selectedRecordIds.add(record.id));
  renderList();
}

export async function getRecordsForHistoryAction() {
  const records = await db.sheets.reverse().toArray();
  return state.selectedRecordIds.size ? records.filter(record => state.selectedRecordIds.has(record.id)) : getVisibleRecords(records);
}

export async function deleteSelectedRecords() {
  const ids = [...state.selectedRecordIds];
  if (!ids.length || !confirm(`Delete ${ids.length} selected record(s)? This action cannot be undone.`)) return;
  await db.sheets.bulkDelete(ids);
  if (state.currentEditingId && ids.includes(state.currentEditingId)) closeEditRecordModal();
  state.selectedRecordIds.clear();
  renderList();
}

export async function deleteRecord(id) {
  if (!confirm(`Delete Record ID: ${id}?`)) return;
  await db.sheets.delete(id);
  if (state.currentEditingId === id) cancelEditMode();
  renderList();
}

