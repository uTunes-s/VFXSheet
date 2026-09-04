// Text-first jsPDF record rendering with Japanese font support.
import { getPdfTextWidth, loadJapanesePdfFont, writePdfText } from './pdf-text-layer.js';
import { getCameraFieldLabel } from './camera-model.js';
import { getRecordShotThumbnails } from './export-naming.js';
import { blobToBase64 } from './backup.js';
import { imageFromBlob } from './media-utils.js';
import { renderHighResolutionSketch } from './pdf-canvas-utils.js';

export async function renderTextPdfRecord(doc, record) {
  await loadJapanesePdfFont(doc);
  const margin = 6;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageBottom = pageHeight - margin;
  const text = value => String(value ?? '').trim() || '-';
  const wrapText = (value, maxCharacters = 48) => {
    const lines = [];
    String(value).split('\n').forEach(paragraph => {
      const characters = [...paragraph];
      if (!characters.length) lines.push('');
      while (characters.length) lines.push(characters.splice(0, maxCharacters).join(''));
    });
    return lines;
  };
  const addSection = (title, fields, startY, columns = 3) => {
    const width = pageWidth - margin * 2;
    const columnWidth = width / columns;
    const characters = Math.max(18, Math.floor(54 / columns));
    const rows = Array.from({ length: Math.ceil(fields.length / columns) }, (_, index) => fields.slice(index * columns, index * columns + columns));
    const cellHeight = value => Math.max(10, 4.8 + wrapText(text(value), characters).length * 3);
    const rowHeights = rows.map(row => Math.max(...row.map(([, value]) => cellHeight(value))));
    const totalHeight = 5 + rowHeights.reduce((sum, height) => sum + height, 0);
    if (startY + totalHeight > pageBottom) { doc.addPage(); startY = margin; }
    doc.setFontSize(10); doc.setTextColor(180, 83, 9); writePdfText(doc, title, margin, startY);
    let y = startY + 4;
    rows.forEach((row, rowIndex) => {
      row.forEach(([label, value], index) => {
        const cellX = margin + index * columnWidth;
        const cellY = y;
        const height = rowHeights[rowIndex];
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(203, 213, 225);
        doc.rect(cellX, cellY, columnWidth, height, 'FD');
        const valueLines = wrapText(text(value), characters);
        const contentTop = (height - (3 + valueLines.length * 3)) / 2;
        doc.setFontSize(5); doc.setTextColor(100, 116, 139); writePdfText(doc, label, cellX + 1.5, cellY + contentTop + 2.7);
        doc.setFontSize(7); doc.setTextColor(15, 23, 42); valueLines.forEach((line, lineIndex) => writePdfText(doc, line, cellX + 1.5, cellY + contentTop + 5.8 + lineIndex * 3));
      });
      y += rowHeights[rowIndex];
    });
    return y + 3;
  };
  const addCameraCard = (camera, startY) => {
    const x = margin;
    const width = pageWidth - margin * 2;
    const columnWidth = width / 6;
    const headerFields = [
      ['Reel', text(getCameraFieldLabel(camera))],
      ['Camera', text(camera.camera)],
      ['Lens', text(camera.lens)]
    ];
    const settingFields = [
      ['Focal Length', text(camera.focal_length)], ['Aperture', text(camera.t_stop)], ['Shutter', text(camera.shutter_speed)], ['Frame Rate', text(camera.frame_rate)], ['ISO / EI', text(camera.iso_ei)], ['White Balance', text(camera.white_balance)],
      ['ND Filter', text(camera.nd_filter)], ['Clip Name', text(camera.clip_name)], ['LUT', text(camera.lut_info)], ['Movement', text(camera.cramerawork)], ['Lens Height', text(camera.height_value)], ['Target Distance', text(camera.distance_value)],
      ['Tilt', text(camera.tilt_value)], ['Color Chart', text(camera.flag_chart)], ['Clean Plate', text(camera.flag_cleanplate)], ['VFX Reference', text(camera.flag_reference)]
    ];
    const cellHeight = (value, characters, minimum = 9) => Math.max(minimum, 4.8 + wrapText(value, characters).length * 3);
    const headerHeight = Math.max(...headerFields.map(([, value]) => cellHeight(value, 18)), 10);
    const settingRows = Array.from({ length: Math.ceil(settingFields.length / 6) }, (_, index) => settingFields.slice(index * 6, index * 6 + 6));
    const rowHeights = settingRows.map(row => Math.max(...row.map(([, value]) => cellHeight(value, 8))));
    const totalHeight = headerHeight + rowHeights.reduce((sum, height) => sum + height, 0);
    if (startY + totalHeight > pageBottom) { doc.addPage(); startY = margin; }
    const drawCell = (cellX, cellY, cellWidth, cellHeightValue, label, value, characters) => {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(203, 213, 225);
      doc.rect(cellX, cellY, cellWidth, cellHeightValue, 'FD');
      const valueLines = wrapText(value, characters);
      const contentTop = (cellHeightValue - (3 + valueLines.length * 3)) / 2;
      doc.setFontSize(5); doc.setTextColor(100, 116, 139); writePdfText(doc, label, cellX + 1.5, cellY + contentTop + 2.7);
      doc.setFontSize(7); doc.setTextColor(15, 23, 42); valueLines.forEach((line, lineIndex) => writePdfText(doc, line, cellX + 1.5, cellY + contentTop + 5.8 + lineIndex * 3));
    };
    headerFields.forEach(([label, value], index) => drawCell(x + index * columnWidth * 2, startY, columnWidth * 2, headerHeight, label, value, 18));
    let y = startY + headerHeight;
    settingRows.forEach((row, rowIndex) => {
      row.forEach(([label, value], index) => drawCell(x + index * columnWidth, y, columnWidth, rowHeights[rowIndex], label, value, 8));
      y += rowHeights[rowIndex];
    });
    return y + 3;
  };
  doc.setTextColor(100, 116, 139); doc.setFontSize(7); writePdfText(doc, `VFX Sheet  |  Record #${record.id}`, margin, 7);
  doc.setFillColor(255, 247, 237); doc.rect(margin, 9, pageWidth - margin * 2, 7, 'F');
  doc.setTextColor(154, 52, 18); doc.setFontSize(13);
  writePdfText(doc, text(record.show_title), (pageWidth - getPdfTextWidth(doc, text(record.show_title))) / 2, 14);
  doc.setFillColor(255, 251, 235); doc.rect(margin, 17, pageWidth - margin * 2, 5.5, 'F');
  doc.setTextColor(146, 64, 14); doc.setFontSize(8.5);
  const shotIdentifier = `${text(record.episode)}_${text(record.scene)}_${text(record.shot)}`;
  writePdfText(doc, shotIdentifier, (pageWidth - getPdfTextWidth(doc, shotIdentifier)) / 2, 20.8);
  let y = 28;
  y = addSection('1. General Information', [
    ['Operator', record.operator], ['Date & Time', record.shoot_datetime], ['Location', record.location], ['GPS', record.gps_location]
  ], y, 4);
  const cameras = record.cameras?.length ? record.cameras : [{ label: 'A', reel_name: 'A' }];
  doc.setFontSize(10); doc.setTextColor(180, 83, 9); writePdfText(doc, '2. Multi-Camera Setup', margin, y); y += 4;
  cameras.forEach(camera => { y = addCameraCard(camera, y); });
  y = addSection('3. HDRI Setup', [
    ['HDRI Captured', record.hdri_captured], ['Weather', Array.isArray(record.hdri_weather) ? record.hdri_weather.join(' / ') : record.hdri_weather], ['HDRI Notes / EV', record.hdri_notes]
  ], y);
  y = addSection('4. VFX Field Notes', [['Notes', record.notes]], y, 1);
  const thumbnailUrls = await Promise.all(getRecordShotThumbnails(record).map(blobToBase64));
  const sketch = await renderHighResolutionSketch(record) || await imageFromBlob(record.images?.[0]);
  if (thumbnailUrls.length || sketch) {
    doc.setFontSize(10); doc.setTextColor(180, 83, 9); writePdfText(doc, '5. Reference Images', margin, y); y += 4;
    const thumbnailHeight = Math.min(24, Math.max(0, pageBottom - y - (sketch ? 24 : 0)));
    const thumbnailWidth = Math.min(34, (pageWidth - margin * 2 - 3 * Math.max(0, thumbnailUrls.length - 1)) / Math.max(1, thumbnailUrls.length));
    if (thumbnailHeight > 0) thumbnailUrls.forEach((url, index) => doc.addImage(url, 'JPEG', margin + index * (thumbnailWidth + 3), y, thumbnailWidth, thumbnailHeight));
    if (thumbnailUrls.length) y += thumbnailHeight + 3;
    if (sketch) {
      const sketchCanvas = document.createElement('canvas');
      sketchCanvas.width = sketch.naturalWidth || sketch.width; sketchCanvas.height = sketch.naturalHeight || sketch.height;
      sketchCanvas.getContext('2d').drawImage(sketch, 0, 0);
      const maxWidth = pageWidth - margin * 2;
      const maxHeight = Math.max(0, Math.min(80, pageBottom - y));
      const scale = Math.min(maxWidth / sketchCanvas.width, maxHeight / sketchCanvas.height);
      const sketchWidth = sketchCanvas.width * scale;
      const sketchHeight = sketchCanvas.height * scale;
      if (sketchHeight > 0) doc.addImage(sketchCanvas.toDataURL('image/png'), 'PNG', margin + (maxWidth - sketchWidth) / 2, y, sketchWidth, sketchHeight);
    }
  }
}

