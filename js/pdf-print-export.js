// Per-camera PDF export orchestration matching the FlowPT ZIP report output.
import { getRecordsForHistoryAction } from './record-selection.js';
import { createShootingDataPdf } from './shooting-data-pdf.js';
import { getShootingDataExportFilename } from './export-naming.js';
import { downloadExportBlob } from './media-utils.js';

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

