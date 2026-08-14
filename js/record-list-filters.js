// Shared query, filtering, and sorting rules for Record Sheets.
import { state } from './state.js';

const STORAGE_KEY = 'vfx-sheet-record-sort';

const text = value => String(value || '').trim();
const comparable = value => text(value).toLocaleLowerCase();
const isSynced = record => record.synced === 1 || record.synced === true || record.synced === '1' || record.synced === 'true';
const filterFields = ['show_title', 'operator', 'location', 'episode', 'scene'];

export function initRecordListPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && typeof saved.field === 'string' && (saved.direction === 'asc' || saved.direction === 'desc')) state.recordListSort = saved;
  } catch (error) {
    console.warn('Unable to read record sort preference.', error);
  }
}

export function updateRecordListFilter(name, value) {
  state.recordListFilters[name] = Array.isArray(value) ? value : value || '';
}

export function toggleRecordListFilterOption(name, value, isSelected) {
  const selected = new Set(state.recordListFilters[name] || []);
  if (isSelected) selected.add(value);
  else selected.delete(value);
  state.recordListFilters[name] = [...selected];
}

export function clearRecordListFilters() {
  state.recordListFilters = { show_title: [], operator: [], location: [], episode: [], scene: [], camera: [], synced: [], dateFrom: '', dateTo: '' };
}

export function getRecordFilterOptions(records) {
  const sortValues = values => [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }));
  return {
    ...Object.fromEntries(filterFields.map(field => [field, sortValues(records.map(record => text(record[field])))])),
    camera: sortValues(records.flatMap(record => (record.cameras || []).map(camera => text(camera.camera))))
  };
}

export function updateRecordListSort(value) {
  const [field, direction] = String(value || 'created_at:desc').split(':');
  state.recordListSort = { field, direction: direction === 'asc' ? 'asc' : 'desc' };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.recordListSort));
  } catch (error) {
    console.warn('Unable to save record sort preference.', error);
  }
}

export function getVisibleRecords(records) {
  const { synced, dateFrom, dateTo } = state.recordListFilters;
  const filtered = records.filter(record => {
    if (filterFields.some(field => state.recordListFilters[field].length && !state.recordListFilters[field].includes(text(record[field])))) return false;
    if (state.recordListFilters.camera.length && !(record.cameras || []).some(camera => state.recordListFilters.camera.includes(text(camera.camera)))) return false;
    if (synced.length && !synced.includes(String(isSynced(record)))) return false;
    const shootDate = text(record.shoot_datetime).slice(0, 10);
    if (dateFrom && (!shootDate || shootDate < dateFrom)) return false;
    if (dateTo && (!shootDate || shootDate > dateTo)) return false;
    return true;
  });

  const { field, direction } = state.recordListSort;
  const multiplier = direction === 'asc' ? 1 : -1;
  return filtered.sort((left, right) => {
    const leftValue = field === 'scene_shot' ? `${text(left.scene)}\u0000${text(left.shot)}` : text(left[field]);
    const rightValue = field === 'scene_shot' ? `${text(right.scene)}\u0000${text(right.shot)}` : text(right[field]);
    if (!leftValue && rightValue) return 1;
    if (leftValue && !rightValue) return -1;
    const comparison = leftValue.localeCompare(rightValue, undefined, { numeric: true, sensitivity: 'base' });
    if (comparison) return comparison * multiplier;
    return (Number(right.id) - Number(left.id)) * multiplier;
  });
}
