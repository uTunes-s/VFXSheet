// Per-camera FlowPT shooting-data PDF generation.
import { renderRecordPdfPage } from './pdf-page-renderer.js';
import { addInvisiblePdfTextLayer } from './pdf-text-layer.js';

export async function createShootingDataPdf(record, camera) {
  if (!window.jspdf?.jsPDF) throw new Error('PDF export library is unavailable. Please reload the app once while online.');
  const doc = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  // One FlowPT Shooting Data item corresponds to one camera/reel. Render the
  // same visual VFX Sheet report layout as PDF export, as one PDF per item.
  // The report background is compressed, then source images are embedded
  // separately at high quality to keep file size low without soft photos.
  const shootingDataRecord = { ...record, cameras: [camera] };
  const reportPage = await renderRecordPdfPage(shootingDataRecord);
  doc.addImage(reportPage.background, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
  reportPage.thumbnailBoxes.forEach(box => addHighResolutionPdfImage(doc, box));
  if (reportPage.sketchBox) addHighResolutionPdfImage(doc, reportPage.sketchBox);
  await addInvisiblePdfTextLayer(doc, shootingDataRecord);
  return new Uint8Array(doc.output('arraybuffer'));
}

export function addHighResolutionPdfImage(doc, { image, x, y, width, height }) {
  if (!image) return;
  const ratio = Math.min(width / image.width, height / image.height);
  const imageWidth = image.width * ratio;
  const imageHeight = image.height * ratio;
  const source = document.createElement('canvas');
  const maxDimension = 2000;
  const sourceRatio = Math.min(1, maxDimension / Math.max(image.width, image.height));
  source.width = Math.max(1, Math.round(image.width * sourceRatio));
  source.height = Math.max(1, Math.round(image.height * sourceRatio));
  source.getContext('2d').drawImage(image, 0, 0, source.width, source.height);
  // renderRecordPdfPage uses a 1240 × 1754 logical A4 layout.
  doc.addImage(source.toDataURL('image/jpeg', 0.88), 'JPEG', (x + (width - imageWidth) / 2) / 1240 * 210, (y + (height - imageHeight) / 2) / 1754 * 297, imageWidth / 1240 * 210, imageHeight / 1754 * 297, undefined, 'FAST');
}

