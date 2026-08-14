// Record history card list rendering.
import { db } from './database.js';
import { state } from './state.js';
import { escapeHtml } from './utils.js';
import { getRecordShotThumbnails } from './export-naming.js';
import { updateHistorySelectionControls } from './record-selection.js';

const selectedRecordIds = state.selectedRecordIds;

export async function renderList() {
  const records = await db.sheets.reverse().toArray();
  const availableIds = new Set(records.map(record => record.id));
  [...state.selectedRecordIds].forEach(id => { if (!availableIds.has(id)) state.selectedRecordIds.delete(id); });
  document.getElementById('totalCount').innerText = records.length;
  document.getElementById('historyNavCount').innerText = `(${records.length})`;
  updateHistorySelectionControls(records);
  const list = document.getElementById('recordList');
  if (!records.length) { list.innerHTML = '<p class="text-xs text-slate-600 text-center py-4">No records saved</p>'; return; }
  const cards = await Promise.all(records.map(async record => {
    const safe = escapeHtml;
    const thumbnails = await Promise.all(getRecordShotThumbnails(record).map(blobToBase64));
    const cameras = (record.cameras || []).map(camera => `<div class="bg-slate-900 border border-slate-800 px-2 py-1 rounded text-[10px] space-y-0.5"><div class="flex justify-between font-bold text-slate-200"><span>🎥 ${safe(camera.label)}: ${safe(camera.camera || '-')} (${safe(camera.lens || '-')})</span><span>Work: ${safe(camera.cramerawork || '-')}</span></div><div class="text-slate-400 flex justify-between"><span>Clip:${safe(camera.clip_name || '-')} Aperture:${safe(camera.t_stop || '-')}</span><span>H:${safe(camera.height_value || '-')} D:${safe(camera.distance_value || '-')} Tilt:${safe(camera.tilt_value || '-')}</span></div><div class="text-slate-400 flex justify-between"><span>Chart:${safe(camera.flag_chart || 'NO')} Clean:${safe(camera.flag_cleanplate || 'NO')} Ref:${safe(camera.flag_reference || 'NO')}</span><span>LUT:${safe(camera.lut_info || '-')}</span></div></div>`).join('');
    const badge = record.synced ? '<span class="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">Synced</span>' : '<span class="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded">Unsynced</span>';
    const thumbnailView = thumbnails.length ? `<div class="relative flex w-28 shrink-0 items-center justify-center">${thumbnails.map((url, index) => `<img src="${url}" alt="Shot thumbnail ${index + 1}" class="record-thumbnail-image h-20 w-28 rounded-lg border border-slate-800 object-cover ${index ? 'hidden' : ''}" data-thumbnail-index="${index}">`).join('')}${thumbnails.length > 1 ? `<button type="button" data-action="change-record-thumbnail" data-direction="-1" aria-label="Previous thumbnail" class="absolute left-1 top-1/2 z-10 -translate-y-1/2 rounded-full border border-slate-600 bg-slate-950/90 px-1.5 py-1 text-xs text-white hover:bg-slate-800">‹</button><button type="button" data-action="change-record-thumbnail" data-direction="1" aria-label="Next thumbnail" class="absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded-full border border-slate-600 bg-slate-950/90 px-1.5 py-1 text-xs text-white hover:bg-slate-800">›</button>` : ''}</div>` : '';
    const hdri = record.hdri_captured === 'YES' ? `<span class="text-amber-400 font-bold">HDRI: YES (${safe(Array.isArray(record.hdri_weather) ? record.hdri_weather.join(' / ') : record.hdri_weather || '-')})</span>` : '<span class="text-slate-500">HDRI: NO</span>';
    return `<div data-action="open-record-preview" data-record-id="${record.id}" class="cursor-pointer bg-slate-950 p-3.5 rounded-xl border ${selectedRecordIds.has(record.id) ? 'border-amber-400/70 ring-1 ring-amber-400/30' : 'border-slate-800'} space-y-2 text-xs hover:border-slate-600"><div class="flex justify-between items-center"><div class="flex min-w-0 items-center gap-2"><input type="checkbox" aria-label="Select record ${record.id}" ${selectedRecordIds.has(record.id) ? 'checked' : ''} data-action="toggle-record-selection" data-record-id="${record.id}" class="h-4 w-4 shrink-0 accent-amber-400"><span class="font-mono text-amber-400 font-bold text-sm truncate">#${record.id} | ${safe(record.show_title)} ${safe(record.episode || '-')}_${safe(record.scene)}_${safe(record.shot)} | ${safe(record.location || '-')}</span><span class="shrink-0 text-[10px] text-slate-500">${safe(record.shoot_datetime || '-')}</span></div><div class="flex gap-2 items-center">${badge}<button type="button" data-action="load-record" data-record-id="${record.id}" class="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] px-3 py-1 rounded-md transition-colors">✏️ Edit</button><button type="button" data-action="load-record" data-record-id="${record.id}" data-duplicate="true" class="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] px-3 py-1 rounded-md border border-slate-700 transition-colors">⧉ Duplicate</button><button type="button" data-action="delete-record" data-record-id="${record.id}" class="text-slate-500 hover:text-rose-400 text-xs px-1">✕</button></div></div><div class="flex gap-2">${thumbnailView}<div class="min-w-0 flex-1 space-y-1">${cameras}</div></div><div class="text-[11px] bg-slate-900/60 p-1.5 rounded border border-slate-800/60 flex justify-between">${hdri}<span class="text-slate-400">${safe(record.hdri_notes || '')}</span></div>${record.notes ? `<div class="text-[11px] text-slate-300 rounded border border-slate-800 bg-slate-900/60 p-2 whitespace-pre-wrap"><span class="mr-1 font-bold text-slate-500">Notes:</span>${safe(record.notes)}</div>` : ''}<div class="text-slate-400 flex flex-wrap justify-between text-[11px] pt-0.5 border-t border-slate-900"><span>${record.gps_location ? `<span class="text-amber-300 font-mono">📍 ${safe(record.gps_location)}</span>` : ''}</span><span class="text-slate-500">Op: ${safe(record.operator || '-')}</span></div></div>`;
  }));
  list.innerHTML = cards.join('');
}

Object.assign(globalThis, { renderList });
