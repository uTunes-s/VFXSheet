// Preset manager list rendering for cameras, lenses, and movements.
import { db } from './database.js';
import { defaultCameras } from './preset-catalog-cameras.js';
import { defaultLenses } from './preset-catalog-lenses.js';
import { defaultMovements, presetCategories } from './preset-catalog-meta.js';
import { getLensSeries, normalizeCameraPresets, normalizeLensPresets, normalizeMovementPresets } from './preset-normalizers.js';
import { openLensSeries } from './preset-store.js';
import { escapeHtml } from './utils.js';

export async function renderPresetModalLists() {
  const camRecord = await db.presets.get('camera');
  const lensRecord = await db.presets.get('lens');
  const movementRecord = await db.presets.get('movement');
  const actionData = (action, values) => `data-action="${action}" ${Object.entries(values).map(([key, value]) => `data-${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}="${escapeHtml(String(value))}"`).join(' ')}`;
  const presetControl = (type, index, enabled) => `<input type="checkbox" ${enabled ? 'checked' : ''} ${actionData('toggle-preset-item', { presetType: type, presetIndex: index })} class="accent-amber-400">`;
  const removeControl = (type, index) => `<button type="button" ${actionData('remove-preset-item', { presetType: type, presetIndex: index })} class="text-rose-400 hover:text-rose-300 font-bold px-1">✕</button>`;
  const renderGroups = (items, type, defaults) => presetCategories.map(category => {
    const group = items.map((item, index) => ({ item, index })).filter(({ item }) => item.category === category);
    if (!group.length) return '';
    return `<li class="pt-2 first:pt-0"><div class="sticky top-0 bg-slate-950 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400">${category}</div>${group.map(({ item, index }) => `<div class="flex justify-between items-center gap-2 bg-slate-900 px-2.5 py-1.5 rounded border border-slate-800"><label class="flex min-w-0 items-center gap-2 cursor-pointer">${presetControl(type, index, item.enabled)}<span class="text-slate-200 truncate">${escapeHtml(item.name)}</span></label>${type === 'lens' ? `<span class="text-[10px] text-slate-500 font-mono">${escapeHtml(item.focal || '')}</span>` : ''}${defaults.some(defaultItem => defaultItem.name === item.name) ? '<span class="text-[10px] text-slate-600">catalogue</span>' : removeControl(type, index)}</div>`).join('')}</li>`;
  }).join('');
  const renderLensSeries = lenses => presetCategories.map(category => {
    const bySeries = new Map();
    lenses.forEach((lens, index) => {
      if (lens.category !== category) return;
      const series = lens.series || getLensSeries(lens);
      if (!bySeries.has(series)) bySeries.set(series, []);
      bySeries.get(series).push({ lens, index });
    });
    if (!bySeries.size) return '';
    const panels = [...bySeries.entries()].map(([series, entries]) => {
      const allEnabled = entries.every(({ lens }) => lens.enabled);
      const someEnabled = entries.some(({ lens }) => lens.enabled);
      const seriesData = actionData('set-lens-series-open', { lensSeries: series });
      const toggleData = actionData('toggle-lens-series', { lensSeries: series });
      return `<li><details ${openLensSeries.has(series) ? 'open' : ''} ${seriesData} class="rounded-lg border border-slate-800 bg-slate-950"><summary class="flex cursor-pointer items-center gap-2 px-2.5 py-2 text-xs font-bold text-amber-300"><input type="checkbox" ${allEnabled ? 'checked' : ''} ${someEnabled && !allEnabled ? 'data-indeterminate="true"' : ''} ${toggleData} class="accent-amber-400"><span>${escapeHtml(series)}</span><span class="ml-auto text-[10px] font-normal text-slate-500">${entries.length} lenses</span></summary><div class="space-y-1 border-t border-slate-800 p-2">${entries.map(({ lens, index }) => `<div class="flex items-center justify-between gap-2 rounded border border-slate-800 bg-slate-900 px-2.5 py-1.5"><label class="flex min-w-0 items-center gap-2 cursor-pointer">${presetControl('lens', index, lens.enabled)}<span class="truncate text-slate-200">${escapeHtml(lens.name)}</span></label><span class="shrink-0 text-[10px] font-mono text-slate-500">${escapeHtml(lens.focal || '')}</span>${defaultLenses.some(defaultLens => defaultLens.name === lens.name) ? '' : removeControl('lens', index)}</div>`).join('')}</div></details></li>`;
    }).join('');
    return `<li class="pt-2 first:pt-0"><div class="sticky top-0 z-10 bg-slate-950 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400">${category}</div><ul class="space-y-1">${panels}</ul></li>`;
  }).join('');
  document.getElementById('cameraPresetList').innerHTML = renderGroups(normalizeCameraPresets(camRecord?.list || []), 'camera', defaultCameras);
  document.getElementById('lensPresetList').innerHTML = renderLensSeries(normalizeLensPresets(lensRecord?.list || []));
  document.getElementById('movementPresetList').innerHTML = normalizeMovementPresets(movementRecord?.list || []).map((item, index) => `<li class="flex justify-between items-center gap-2 bg-slate-900 px-2.5 py-1.5 rounded border border-slate-800"><label class="flex min-w-0 items-center gap-2 cursor-pointer">${presetControl('movement', index, item.enabled)}<span class="text-slate-200 truncate">${escapeHtml(item.name)}</span></label>${defaultMovements.some(defaultItem => defaultItem.name === item.name) ? '<span class="text-[10px] text-slate-600">catalogue</span>' : removeControl('movement', index)}</li>`).join('');
  document.querySelectorAll('#lensPresetList input[data-indeterminate="true"]').forEach(input => { input.indeterminate = true; });
}

globalThis.renderPresetModalLists = renderPresetModalLists;
