// Raster report page renderer used by camera-specific PDF exports.
import { getRecordShotThumbnails } from './export-naming.js';
import { imageFromBlob } from './media-utils.js';
import { renderHighResolutionSketch, drawPdfHeaderMeta, drawPdfSectionTitle, drawPdfTable, drawPdfCameraTable, drawImageContain } from './pdf-canvas-utils.js';

export async function renderRecordPdfPage(record) {
  const canvas = document.createElement('canvas'); canvas.width = 2480; canvas.height = 3508;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(2, 2);
  ctx.fillStyle = '#0f172a'; ctx.font = 'bold 30px sans-serif'; ctx.fillText('VFX Sheet', 40, 55);
  ctx.fillStyle = '#64748b'; ctx.font = '14px sans-serif'; ctx.fillText(`Record #${record.id}`, 40, 79);
  drawPdfHeaderMeta(ctx, record);
  let y = 128;
  y = drawPdfSectionTitle(ctx, '1. General Information', y);
  y = drawPdfTable(ctx, y, [[{ label: 'Location', value: record.location }, { label: 'Episode', value: record.episode }, { label: 'Scene', value: record.scene }, { label: 'Shot', value: record.shot }]], 4);
  y = drawPdfSectionTitle(ctx, '2. Multi-Camera Setup', y + 12);
  const cameras = record.cameras?.length ? record.cameras : [{ label: 'A', reel_name: 'A' }];
  cameras.forEach((camera, index) => { y = drawPdfCameraTable(ctx, y, camera, index + 1); y += 10; });
  y = drawPdfSectionTitle(ctx, '3. HDRI Setup', y + 4);
  y = drawPdfTable(ctx, y, [[{ label: 'HDRI Captured', value: record.hdri_captured || 'NO' }, { label: 'Weather', value: Array.isArray(record.hdri_weather) ? record.hdri_weather.join(' / ') : record.hdri_weather }, { label: 'HDRI Notes / EV', value: record.hdri_notes }]], 3);
  y = drawPdfSectionTitle(ctx, '4. VFX Field Notes & Sketch', y + 12);
  y = drawPdfTable(ctx, y, [[{ label: 'VFX Notes', value: record.notes }]], 1);
  const thumbnails = await Promise.all(getRecordShotThumbnails(record).map(imageFromBlob));
  const sketch = await renderHighResolutionSketch(record) || await imageFromBlob(record.images?.[0]);
  const thumbnailBoxes = [];
  let imageY = Math.max(y + 14, 760);
  if (thumbnails.length) {
    ctx.fillStyle = '#b45309'; ctx.font = 'bold 20px sans-serif'; ctx.fillText('Shot Thumbnails', 60, imageY);
    const gap = 12; const thumbnailWidth = Math.min(220, (1160 - gap * (thumbnails.length - 1)) / thumbnails.length); const thumbnailHeight = 100;
    thumbnails.forEach((thumbnail, index) => { const x = 40 + index * (thumbnailWidth + gap); ctx.fillStyle = '#e2e8f0'; ctx.fillRect(x, imageY + 12, thumbnailWidth, thumbnailHeight); if (thumbnail) { drawImageContain(ctx, thumbnail, x, imageY + 12, thumbnailWidth, thumbnailHeight); thumbnailBoxes.push({ image: thumbnail, x, y: imageY + 12, width: thumbnailWidth, height: thumbnailHeight }); } });
    imageY += 142;
  }
  ctx.fillStyle = '#b45309'; ctx.font = 'bold 18px sans-serif'; ctx.fillText('Field Sketch', 40, imageY);
  ctx.fillStyle = '#e2e8f0'; ctx.fillRect(40, imageY + 12, 1160, 760);
  if (sketch) drawImageContain(ctx, sketch, 40, imageY + 12, 1160, 760);
  const compressedCanvas = document.createElement('canvas');
  compressedCanvas.width = 1488; compressedCanvas.height = 2105;
  compressedCanvas.getContext('2d').drawImage(canvas, 0, 0, compressedCanvas.width, compressedCanvas.height);
  return { background: compressedCanvas.toDataURL('image/jpeg', 0.66), thumbnailBoxes, sketchBox: sketch ? { image: sketch, x: 40, y: imageY + 12, width: 1160, height: 760 } : null };
}

Object.assign(globalThis, { renderRecordPdfPage });
