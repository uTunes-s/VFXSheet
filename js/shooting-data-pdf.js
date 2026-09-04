// Per-camera FlowPT shooting-data PDF generation.
import { renderTextPdfRecord } from './pdf-text-record.js';

export async function createShootingDataPdf(record, camera) {
  if (!window.jspdf?.jsPDF) throw new Error('PDF export library is unavailable. Please reload the app once while online.');
  const doc = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  // One FlowPT Shooting Data item corresponds to one camera/reel. The report
  // uses embedded Unicode Japanese text and preserves selectable text.
  const shootingDataRecord = { ...record, cameras: [camera] };
  await renderTextPdfRecord(doc, shootingDataRecord);
  return new Uint8Array(doc.output('arraybuffer'));
}

