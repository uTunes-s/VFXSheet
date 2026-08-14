// Record history selection and deletion controls.
import { db } from './database.js';
import { state } from './state.js';

export function updateHistorySelectionControls(records = []) {
  const selectedCount = state.selectedRecordIds.size;
  const deleteButton = document.getElementById('deleteSelectedBtn');
  const selectAllButton = document.getElementById('selectAllRecordsBtn');
  deleteButton.disabled = selectedCount === 0;
  deleteButton.innerText = `Delete Selected (${selectedCount})`;
  selectAllButton.innerText = records.length && selectedCount === records.length ? 'Clear Selection' : 'Select All';
}

export function toggleRecordSelection(id, isSelected) {
  if (isSelected) state.selectedRecordIds.add(id);
  else state.selectedRecordIds.delete(id);
  renderList();
}

export async function toggleSelectAllRecords() {
  const records = await db.sheets.toArray();
  if (records.length && state.selectedRecordIds.size === records.length) state.selectedRecordIds.clear();
  else records.forEach(record => state.selectedRecordIds.add(record.id));
  renderList();
}

export async function getRecordsForHistoryAction() {
  const records = await db.sheets.reverse().toArray();
  return state.selectedRecordIds.size ? records.filter(record => state.selectedRecordIds.has(record.id)) : records;
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

Object.assign(globalThis, { updateHistorySelectionControls, toggleRecordSelection, toggleSelectAllRecords, getRecordsForHistoryAction, deleteSelectedRecords, deleteRecord });
