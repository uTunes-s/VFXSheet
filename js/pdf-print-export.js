// Per-camera PDF export orchestration matching the FlowPT ZIP report output.
import { getRecordsForHistoryAction } from './record-selection.js';
import { createShootingDataPdf, createMergedShootingDataPdf } from './shooting-data-pdf.js';
import { getShootingDataExportFilename } from './export-naming.js';
import { downloadExportBlob } from './media-utils.js';

function askPdfExportMode(count) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4';
    overlay.innerHTML = `<div class="w-full max-w-sm space-y-3 rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl" role="dialog" aria-modal="true">
      <h3 class="text-base font-bold text-slate-100">Export PDF (${count} page${count === 1 ? '' : 's'})</h3>
      <button type="button" data-mode="separate" class="w-full rounded-xl bg-rose-700 px-4 py-3 text-left text-sm font-medium text-white hover:bg-rose-600">Separate files<span class="block text-xs font-normal text-rose-100/80">One PDF per page</span></button>
      <button type="button" data-mode="merged" class="w-full rounded-xl bg-amber-500 px-4 py-3 text-left text-sm font-medium text-slate-950 hover:bg-amber-400">Merge into one file<span class="block text-xs font-normal text-slate-800">All pages combined into a single PDF</span></button>
      <button type="button" data-mode="" class="w-full rounded-xl border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Cancel</button>
    </div>`;
    overlay.addEventListener('click', event => {
      const button = event.target.closest('button[data-mode]');
      if (!button && event.target !== overlay) return;
      overlay.remove();
      resolve(button?.dataset.mode || null);
    });
    document.body.appendChild(overlay);
  });
}

function getMergedPdfFilename(items) {
  const dates = items.map(({ record }) => String(record.shoot_datetime || '').match(/^\d{4}-\d{2}-\d{2}/)?.[0].replaceAll('-', '')).filter(Boolean).sort();
  const now = new Date(); const pad = n => String(n).padStart(2, '0');
  const stamp = dates[0] || `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  return `VFXSheet_${stamp}_${items.length}pages.pdf`;
}

export async function exportToPDF() {
  const button = document.getElementById('exportPdfBtn');
  const originalLabel = button.innerHTML;
  button.disabled = true;
  button.innerText = 'Creating PDF…';
  try {
    const records = await getRecordsForHistoryAction();
    if (!records?.length) {
      return alert('No records to export.');
    }
    const items = new Map();
    records.forEach(record => (record.cameras?.length ? record.cameras : [{}]).forEach(camera => {
      const filename = getShootingDataExportFilename(record, camera, 'pdf');
      if (!items.has(filename)) items.set(filename, { record, camera });
    }));
    const mode = await askPdfExportMode(items.size);
    if (!mode) return;
    if (mode === 'merged') {
      const list = [...items.values()];
      button.innerText = 'Creating PDF…';
      const pdf = await createMergedShootingDataPdf(list);
      downloadExportBlob(new Blob([pdf], { type: 'application/pdf' }), getMergedPdfFilename(list));
      alert(`1 PDF file (${list.length} pages) exported.`);
      return;
    }
    let exported = 0;
    for (const [filename, { record, camera }] of items) {
      button.innerText = `Creating PDF ${exported + 1}/${items.size}…`;
      const pdf = await createShootingDataPdf(record, camera);
      downloadExportBlob(new Blob([pdf], { type: 'application/pdf' }), filename);
      exported += 1;
    }
    alert(`${exported} PDF file(s) exported.`);
  } catch (error) {
    console.error('PDF export error:', error);
    alert(`PDF Export Error: ${error.message || error}`);
  } finally {
    button.disabled = false;
    button.innerHTML = originalLabel;
  }
}

