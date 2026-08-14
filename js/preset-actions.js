// Mutations for the preset catalog modal.
import { db } from './database.js';
import { defaultCameras } from './preset-catalog-cameras.js';
import { defaultLenses } from './preset-catalog-lenses.js';
import { defaultMovements } from './preset-catalog-meta.js';
import { getLensSeries, normalizeCameraPresets, normalizeLensPresets, normalizeMovementPresets } from './preset-normalizers.js';
import { initPresets, openLensSeries } from './preset-store.js';
import { renderPresetModalLists } from './preset-list-renderer.js';

export function normalizedPresetList(type, list) {
  if (type === 'camera') return normalizeCameraPresets(list);
  if (type === 'lens') return normalizeLensPresets(list);
  return normalizeMovementPresets(list);
}

export async function addPresetItem(type) {
  const configs = {
    camera: { input: 'newCameraInput', field: 'name', duplicate: 'This camera model is already registered.', item: value => ({ name: value, category: 'Custom', enabled: true }) },
    lens: { input: 'newLensNameInput', field: 'name', duplicate: 'This lens model is already registered.', item: value => ({ name: value, focal: document.getElementById('newLensFocalInput').value.trim(), category: 'Custom', enabled: true }) },
    movement: { input: 'newMovementInput', field: 'name', duplicate: 'This movement is already registered.', item: value => ({ name: value, enabled: true }) }
  };
  const config = configs[type];
  const input = document.getElementById(config.input);
  const value = input.value.trim();
  if (!value) return;
  const record = await db.presets.get(type);
  record.list = normalizedPresetList(type, record.list);
  if (record.list.some(item => item[config.field] === value)) return alert(config.duplicate);
  record.list.push(config.item(value));
  await db.presets.put(record);
  input.value = '';
  if (type === 'lens') document.getElementById('newLensFocalInput').value = '';
  await initPresets();
  renderPresetModalLists();
}

// Public APIs are exposed only through named ES module exports.
export async function togglePresetItem(type, index, enabled) {
  const record = await db.presets.get(type);
  record.list = normalizedPresetList(type, record.list);
  if (!record.list[index]) return;
  record.list[index].enabled = enabled;
  await db.presets.put(record);
  await initPresets();
  renderPresetModalLists();
}

export function setLensSeriesOpen(series, isOpen) {
  if (isOpen) openLensSeries.add(series);
  else openLensSeries.delete(series);
}

export async function toggleLensSeries(series, enabled) {
  const record = await db.presets.get('lens');
  record.list = normalizeLensPresets(record.list).map(lens => getLensSeries(lens) === series ? { ...lens, enabled } : lens);
  await db.presets.put(record);
  await initPresets();
  renderPresetModalLists();
}

export async function removePresetItem(type, index) {
  const record = await db.presets.get(type);
  record.list = normalizedPresetList(type, record.list);
  record.list.splice(index, 1);
  await db.presets.put(record);
  await initPresets();
  renderPresetModalLists();
}

export async function resetPresetsToDefault() {
  if (!confirm('Reset all presets to default?')) return;
  await db.presets.put({ type: 'camera', list: defaultCameras });
  await db.presets.put({ type: 'lens', list: defaultLenses });
  await db.presets.put({ type: 'movement', list: defaultMovements });
  await db.presets.delete('user_defaults');
  await initPresets();
  renderPresetModalLists();
}

