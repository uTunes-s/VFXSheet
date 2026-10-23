// Preset manager list rendering for cameras, lenses, and movements.
import { db } from './database.js';
import { defaultMovements } from './preset-catalog-meta.js';
import { normalizeMovementPresets } from './preset-normalizers.js';
import { isPresetManagerOpen, renderPresetManager } from './preset-manager.js';
import { escapeHtml } from './utils.js';

export async function renderPresetModalLists() {
  const movementRecord = await db.presets.get('movement');
  const actionData = (action, values) => `data-action="${action}" ${Object.entries(values).map(([key, value]) => `data-${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}="${escapeHtml(String(value))}"`).join(' ')}`;
  const presetControl = (type, index, enabled) => `<input type="checkbox" ${enabled ? 'checked' : ''} ${actionData('toggle-preset-item', { presetType: type, presetIndex: index })} class="accent-amber-400">`;
  const removeControl = (type, index) => `<button type="button" ${actionData('remove-preset-item', { presetType: type, presetIndex: index })} class="text-rose-400 hover:text-rose-300 font-bold px-1">✕</button>`;
  document.getElementById('movementPresetList').innerHTML = normalizeMovementPresets(movementRecord?.list || []).map((item, index) => `<li class="flex justify-between items-center gap-2 bg-slate-900 px-2.5 py-1.5 rounded border border-slate-800"><label class="flex min-w-0 items-center gap-2 cursor-pointer">${presetControl('movement', index, item.enabled)}<span class="text-slate-200 truncate">${escapeHtml(item.name)}</span></label>${defaultMovements.some(defaultItem => defaultItem.name === item.name) ? '<span class="text-[10px] text-slate-600">catalogue</span>' : removeControl('movement', index)}</li>`).join('');
  if (isPresetManagerOpen()) await renderPresetManager();
}

// Public APIs are exposed only through named ES module exports.

