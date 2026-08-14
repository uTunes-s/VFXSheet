// Text-first jsPDF record rendering with Japanese font support.
import { loadJapanesePdfFont } from './pdf-text-layer.js';
import { getCameraFieldLabel } from './camera-model.js';
import { getRecordShotThumbnails } from './export-naming.js';
import { blobToBase64 } from './backup.js';
import { imageFromBlob } from './media-utils.js';
import { renderHighResolutionSketch } from './pdf-canvas-utils.js';

export async function renderTextPdfRecord(doc, record) {
  await loadJapanesePdfFont(doc);
  const margin = 12;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const text = value => String(value ?? '').trim() || '-';
  const addSection = (title, rows, startY) => {
    doc.setFontSize(11); doc.setTextColor(180, 83, 9); doc.text(title, margin, startY);
    let y = startY + 5;
    doc.setFontSize(7.5);
    rows.forEach((row, index) => {
      const clipped = [...row.map(value => text(value)).join('  |  ')].slice(0, 58).join('');
      doc.setFillColor(index % 2 ? 248 : 241, index % 2 ? 250 : 245, index % 2 ? 252 : 249);
      doc.rect(margin, y - 3.2, pageWidth - margin * 2, 5.6, 'F');
      doc.setTextColor(15, 23, 42); doc.text(clipped, margin + 2, y); y += 6;
    });
    return y + 4;
  };
  doc.setTextColor(15, 23, 42); doc.setFontSize(18); doc.text('VFX Sheet', margin, 16);
  doc.setFontSize(8); doc.setTextColor(100, 116, 139);
  doc.text(`Record #${record.id}  |  ${text(record.show_title)}  |  ${text(record.episode)}_${text(record.scene)}_${text(record.shot)}`, margin, 22);
  let y = 30;
  y = addSection('1. General Information', [['Operator', text(record.operator), 'Date & Time', text(record.shoot_datetime), 'Location', text(record.location), 'GPS', text(record.gps_location)]], y);
  const cameras = record.cameras?.length ? record.cameras : [{ label: 'A', reel_name: 'A' }];
  y = addSection('2. Multi-Camera Setup', [['Reel', 'Camera', 'Lens / Focal', 'T Stop', 'Clip Name', 'Movement', 'Height / Distance / Tilt', 'LUT / Reference'], ...cameras.map(camera => [text(getCameraFieldLabel(camera)), text(camera.camera), `${text(camera.lens)} / ${text(camera.focal_length)}`, text(camera.t_stop), text(camera.clip_name), text(camera.cramerawork), `${text(camera.height_value)} / ${text(camera.distance_value)} / ${text(camera.tilt_value)}`, `${text(camera.lut_info)} / Chart:${text(camera.flag_chart)} Clean:${text(camera.flag_cleanplate)} Ref:${text(camera.flag_reference)}`])], y);
  y = addSection('3. HDRI Setup', [['HDRI Captured', text(record.hdri_captured), 'Weather', text(Array.isArray(record.hdri_weather) ? record.hdri_weather.join(' / ') : record.hdri_weather), 'HDRI Notes / EV', text(record.hdri_notes)]], y);
  y = addSection('4. VFX Field Notes', [['Notes', text(record.notes)]], y);
  const thumbnailUrls = await Promise.all(getRecordShotThumbnails(record).map(blobToBase64));
  const sketch = await renderHighResolutionSketch(record) || await imageFromBlob(record.images?.[0]);
  if (thumbnailUrls.length || sketch) {
    if (y > pageHeight - 95) { doc.addPage(); y = 18; }
    doc.setFontSize(11); doc.setTextColor(180, 83, 9); doc.text('5. Reference Images', margin, y); y += 4;
    const thumbnailWidth = Math.min(42, (pageWidth - margin * 2 - 3 * Math.max(0, thumbnailUrls.length - 1)) / Math.max(1, thumbnailUrls.length));
    thumbnailUrls.forEach((url, index) => doc.addImage(url, 'JPEG', margin + index * (thumbnailWidth + 3), y, thumbnailWidth, 30));
    if (thumbnailUrls.length) y += 36;
    if (sketch) {
      if (y > pageHeight - 105) { doc.addPage(); y = 18; }
      const sketchCanvas = document.createElement('canvas');
      sketchCanvas.width = sketch.naturalWidth || sketch.width; sketchCanvas.height = sketch.naturalHeight || sketch.height;
      sketchCanvas.getContext('2d').drawImage(sketch, 0, 0);
      doc.addImage(sketchCanvas.toDataURL('image/png'), 'PNG', margin, y, pageWidth - margin * 2, 80);
    }
  }
}

