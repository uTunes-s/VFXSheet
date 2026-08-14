// Import, export, reset, and summarize saved sheet defaults.
import { db } from './database.js';
import { downloadExportBlob } from './media-utils.js';
import { escapeHtml } from './utils.js';
import { getInitialSettingEnabledFields } from './default-settings.js';
import { blobToBase64, dataUrlToBlob } from './backup.js';

export async function exportSheetInitialSettings() {
  const values = (await db.presets.get('user_defaults'))?.values;
  if (!values) return alert('There are no saved sheet defaults to export. Save the defaults first.');
  const exportValues = { ...values, shot_thumbnails: await Promise.all((values.shot_thumbnails || []).map(blobToBase64)) };
  const payload = { app: 'VFX_Sheet', type: 'sheet_initial_settings', version: 1, exported_at: new Date().toISOString(), values: exportValues };
  downloadExportBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `VFX_Sheet_Initial_Settings_${new Date().toISOString().slice(0, 10)}.json`);
}

export function selectSheetInitialSettingsImport() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.addEventListener('change', () => importSheetInitialSettings(input.files?.[0]), { once: true });
  input.click();
}

export async function importSheetInitialSettings(file) {
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (data?.app !== 'VFX_Sheet' || data?.type !== 'sheet_initial_settings' || !data?.values) throw new Error('This is not a sheet-defaults file.');
    const values = { ...data.values, shot_thumbnails: await Promise.all((data.values.shot_thumbnails || []).map(dataUrlToBlob)) };
    await db.presets.put({ type: 'user_defaults', values });
    alert('Sheet defaults imported.');
    closeEditRecordModal();
    await openAddDefaultsEditor();
  } catch (error) {
    alert(`Import failed: ${error.message}`);
  }
}

export async function resetAddDefaults() {
  if (!confirm('Reset sheet defaults? Available camera and lens options will not be changed.')) return;
  await db.presets.delete('user_defaults');
  await renderAddDefaultsSummary();
  alert('Sheet defaults have been reset.');
}

export async function renderAddDefaultsSummary() {
  const summary = document.getElementById('addDefaultsSummary');
  if (!summary) return;
  const values = (await db.presets.get('user_defaults'))?.values;
  if (!values) {
    summary.innerHTML = '<span class="text-slate-500">Not configured: a blank form and the standard camera setup will be used.</span>';
    return;
  }
  const fields = [values.operator && `Operator: ${escapeHtml(values.operator)}`, values.show_title && `Title: ${escapeHtml(values.show_title)}`, values.location && `Location: ${escapeHtml(values.location)}`].filter(Boolean);
  const cameras = values.cameras?.map(camera => escapeHtml(camera.label || 'Camera')).join(', ') || 'None';
  const enabledCount = Object.values(getInitialSettingEnabledFields(values)).filter(Boolean).length;
  summary.innerHTML = `<span class="text-emerald-400">Configured</span><span class="text-slate-500"> — ${fields.join(' / ') || 'No general information'} / Cameras: ${cameras} / Applied fields: ${enabledCount}</span>`;
}

Object.assign(globalThis, { exportSheetInitialSettings, selectSheetInitialSettingsImport, importSheetInitialSettings, resetAddDefaults, renderAddDefaultsSummary });
