// Two-column (OFF / ON) preset manager popup for cameras and lenses.
import { db } from './database.js';
import { defaultCameras } from './preset-catalog-cameras.js';
import { defaultLenses } from './preset-catalog-lenses.js';
import { presetCategories } from './preset-catalog-meta.js';
import { getLensSeries, normalizeCameraPresets, normalizeLensPresets } from './preset-normalizers.js';
import { escapeHtml } from './utils.js';

const managerState = { type: 'camera', filter: '' };
const titles = { camera: 'Manage Cameras', lens: 'Manage Lenses' };
const modal = () => document.getElementById('presetManagerModal');

export function isPresetManagerOpen() {
  return !modal().classList.contains('hidden');
}

export async function openPresetManager(type) {
  managerState.type = type;
  managerState.filter = '';
  document.getElementById('presetManagerFilter').value = '';
  document.getElementById('presetManagerTitle').textContent = titles[type];
  document.getElementById('presetManagerAddCamera').classList.toggle('hidden', type !== 'camera');
  document.getElementById('presetManagerAddLens').classList.toggle('hidden', type !== 'lens');
  modal().classList.remove('hidden');
  await renderPresetManager();
}

export function closePresetManager() {
  modal().classList.add('hidden');
}

export function setPresetManagerFilter(value) {
  managerState.filter = value.trim().toLowerCase();
  renderPresetManager();
}

export async function renderPresetManager() {
  const { type, filter } = managerState;
  const record = await db.presets.get(type);
  const items = type === 'camera' ? normalizeCameraPresets(record?.list || []) : normalizeLensPresets(record?.list || []);
  const defaults = type === 'camera' ? defaultCameras : defaultLenses;
  const attrs = values => Object.entries(values).map(([key, value]) => `data-${key}="${escapeHtml(String(value))}"`).join(' ');
  const row = (item, index, toEnabled) => {
    const isDefault = defaults.some(defaultItem => defaultItem.name === item.name);
    const label = `<span class="truncate text-slate-200">${escapeHtml(item.name)}</span>${type === 'lens' ? `<span class="shrink-0 text-[10px] font-mono text-slate-500">${escapeHtml(item.focal || '')}</span>` : ''}`;
    const move = `<button type="button" data-action="move-preset-item" ${attrs({ 'preset-type': type, 'preset-index': index, enabled: toEnabled })} class="flex min-w-0 flex-1 items-center gap-2 text-left" title="${toEnabled ? 'Turn ON' : 'Turn OFF'}">${toEnabled ? '' : '<span class="text-amber-400">←</span>'}${label}${toEnabled ? '<span class="ml-auto text-amber-400">→</span>' : ''}</button>`;
    const remove = isDefault ? '' : `<button type="button" data-action="remove-preset-item" ${attrs({ 'preset-type': type, 'preset-index': index })} class="px-1 font-bold text-rose-400 hover:text-rose-300">✕</button>`;
    return `<div class="flex items-center gap-2 rounded border border-slate-800 bg-slate-900 px-2.5 py-1.5 hover:border-amber-500/50">${move}${remove}</div>`;
  };
  const render = enabled => presetCategories.map(category => {
    const entries = items.map((item, index) => ({ item, index })).filter(({ item }) => item.category === category && !!item.enabled === enabled
      && (!filter || `${item.name} ${item.focal || ''}`.toLowerCase().includes(filter)));
    if (!entries.length) return '';
    const bySeries = new Map();
    entries.forEach(entry => {
      const series = type === 'lens' ? (entry.item.series || getLensSeries(entry.item)) : '';
      if (!bySeries.has(series)) bySeries.set(series, []);
      bySeries.get(series).push(entry);
    });
    const blocks = [...bySeries.entries()].map(([series, group]) => {
      const header = series ? `<div class="flex items-center gap-2 pt-1 text-[11px] font-bold text-amber-300"><span class="truncate">${escapeHtml(series)}</span><span class="font-normal text-slate-500">${group.length}</span><button type="button" data-action="move-lens-series" ${attrs({ 'lens-series': series, enabled: !enabled })} class="ml-auto shrink-0 rounded border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-800">${enabled ? '← All OFF' : 'All ON →'}</button></div>` : '';
      return `${header}<div class="space-y-1">${group.map(({ item, index }) => row(item, index, !enabled)).join('')}</div>`;
    }).join('');
    return `<div class="space-y-1"><div class="sticky top-0 z-10 bg-slate-950 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400">${category}</div>${blocks}</div>`;
  }).join('') || '<div class="p-3 text-center text-[11px] text-slate-600">No presets</div>';
  const count = enabled => items.filter(item => !!item.enabled === enabled).length;
  document.getElementById('presetManagerOffList').innerHTML = render(false);
  document.getElementById('presetManagerOnList').innerHTML = render(true);
  document.getElementById('presetManagerOffCount').textContent = count(false);
  document.getElementById('presetManagerOnCount').textContent = count(true);
}

// Public APIs are exposed only through named ES module exports.
