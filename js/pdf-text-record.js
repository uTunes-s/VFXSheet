// Text-first jsPDF record rendering with Japanese font support.
import { getPdfTextWidth, loadJapanesePdfFont, writePdfText } from './pdf-text-layer.js';
import { getCameraFieldLabel } from './camera-model.js';
import { getRecordShotThumbnails } from './export-naming.js';
import { blobToBase64 } from './backup.js';
import { imageFromBlob } from './media-utils.js';
import { renderHighResolutionSketch } from './pdf-canvas-utils.js';

const SKETCH_ASPECT = 480 / 760;

export async function renderTextPdfRecord(doc, record) {
  await loadJapanesePdfFont(doc);
  const margin = 6;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageBottom = pageHeight - margin;
  const contentWidth = pageWidth - margin * 2;
  const text = value => String(value ?? '').trim() || '-';

  const wrapByWidth = (value, maxWidth, fontSize) => {
    doc.setFontSize(fontSize);
    const lines = [];
    String(value).split('\n').forEach(paragraph => {
      let line = '';
      for (const character of paragraph) {
        if (line && getPdfTextWidth(doc, line + character) > maxWidth) { lines.push(line); line = character; }
        else line += character;
      }
      lines.push(line);
    });
    return lines;
  };

  const drawTitle = (title, y) => {
    doc.setFontSize(8); doc.setTextColor(180, 83, 9); writePdfText(doc, title, margin, y + 2.6);
    return y + 4;
  };

  // Draws one row of [label, value, weight] cells sharing the full content width.
  const drawRow = (fields, y) => {
    const totalWeight = fields.reduce((sum, [, , weight = 1]) => sum + weight, 0);
    const cells = fields.map(([label, value, weight = 1]) => {
      const width = contentWidth * weight / totalWeight;
      return { label, width, lines: wrapByWidth(text(value), width - 3, 7) };
    });
    const height = Math.max(8.2, 4.6 + Math.max(...cells.map(cell => cell.lines.length)) * 3);
    let x = margin;
    cells.forEach(cell => {
      doc.setFillColor(255, 255, 255); doc.setDrawColor(203, 213, 225);
      doc.rect(x, y, cell.width, height, 'FD');
      doc.setFontSize(5); doc.setTextColor(100, 116, 139); writePdfText(doc, cell.label, x + 1.5, y + 2.7);
      doc.setFontSize(7); doc.setTextColor(15, 23, 42);
      cell.lines.forEach((line, index) => writePdfText(doc, line, x + 1.5, y + 5.8 + index * 3));
      x += cell.width;
    });
    return y + height;
  };

  const drawCamera = (camera, y) => {
    y = drawRow([['Reel', getCameraFieldLabel(camera), 1], ['Camera', camera.camera, 3], ['Lens', camera.lens, 3]], y);
    y = drawRow([
      ['Focal Length', camera.focal_length], ['T-Stop', camera.t_stop], ['Shutter', camera.shutter_speed], ['Frame Rate', camera.frame_rate],
      ['ISO / EI', camera.iso_ei], ['White Balance', camera.white_balance], ['ND Filter', camera.nd_filter], ['Codec', camera.codec], ['Clip Name', camera.clip_name, 1.4]
    ], y);
    return drawRow([
      ['LUT Info', camera.lut_info, 2], ['Movement', camera.cramerawork, 1.2], ['Lens Height', camera.height_value], ['Distance', camera.distance_value], ['Tilt', camera.tilt_value],
      ['Chart', camera.flag_chart || 'NO', 0.8], ['Clean Plate', camera.flag_cleanplate || 'NO', 0.8], ['VFX Ref', camera.flag_reference || 'NO', 0.8]
    ], y);
  };

  const drawNotes = y => {
    const lines = wrapByWidth(text(record.notes), contentWidth - 3, 8);
    const height = Math.max(13, 4.6 + lines.length * 3.4);
    doc.setFillColor(255, 255, 255); doc.setDrawColor(203, 213, 225);
    doc.rect(margin, y, contentWidth, height, 'FD');
    doc.setFontSize(5); doc.setTextColor(100, 116, 139); writePdfText(doc, 'Notes', margin + 1.5, y + 2.7);
    doc.setFontSize(8); doc.setTextColor(15, 23, 42);
    lines.forEach((line, index) => writePdfText(doc, line, margin + 1.5, y + 6.2 + index * 3.4));
    return y + height;
  };

  const imageFormat = dataUrl => /^data:image\/png/i.test(dataUrl) ? 'PNG' : 'JPEG';

  doc.setTextColor(100, 116, 139); doc.setFontSize(7); writePdfText(doc, `VFX Sheet  |  Record #${record.id}`, margin, 7);
  doc.setFillColor(255, 247, 237); doc.rect(margin, 9, contentWidth, 7, 'F');
  doc.setTextColor(154, 52, 18); doc.setFontSize(13);
  writePdfText(doc, text(record.show_title), (pageWidth - getPdfTextWidth(doc, text(record.show_title))) / 2, 14);
  doc.setFillColor(255, 251, 235); doc.rect(margin, 17, contentWidth, 5.5, 'F');
  doc.setTextColor(146, 64, 14); doc.setFontSize(8.5);
  const shotIdentifier = `${text(record.episode)}_${text(record.scene)}_${text(record.shot)}`;
  writePdfText(doc, shotIdentifier, (pageWidth - getPdfTextWidth(doc, shotIdentifier)) / 2, 20.8);

  let y = 25;
  y = drawTitle('General Information', y);
  y = drawRow([['Operator', record.operator, 1], ['Date & Time', record.shoot_datetime, 1.2], ['Location', record.location, 1.6], ['GPS', record.gps_location, 1.4]], y) + 2;

  const cameras = record.cameras?.length ? record.cameras : [{ label: 'A', reel_name: 'A' }];
  y = drawTitle('Camera Setup', y);
  cameras.forEach(camera => { y = drawCamera(camera, y) + 2; });

  y = drawTitle('HDRI Captured', y);
  const weather = Array.isArray(record.hdri_weather) ? record.hdri_weather.join(' / ') : record.hdri_weather;
  y = drawRow([['HDRI Captured', record.hdri_captured || 'NO', 1], ['Weather', weather, 3], ['HDRI Notes / EV', record.hdri_notes, 5]], y) + 2;

  y = drawNotes(y) + 3;

  const thumbnails = (await Promise.all(getRecordShotThumbnails(record).map(async blob => {
    const [image, url] = await Promise.all([imageFromBlob(blob), blobToBase64(blob)]);
    return image && url ? { image, url } : null;
  }))).filter(Boolean);
  const sketch = await renderHighResolutionSketch(record) || await imageFromBlob(record.images?.[0]);

  // Sketch always spans the full width; thumbnails use whatever height remains.
  const labelHeight = 4;
  const minThumbnailHeight = 20;
  const available = pageBottom - y;
  let sketchHeight = 0;
  if (sketch) {
    const reserved = thumbnails.length ? labelHeight + minThumbnailHeight + 3 : 0;
    sketchHeight = Math.max(0, Math.min(contentWidth * SKETCH_ASPECT, available - labelHeight - reserved));
  }
  if (thumbnails.length) {
    const areaHeight = available - (sketch ? sketchHeight + labelHeight + 3 : 0) - labelHeight;
    if (areaHeight > 5) {
      y = drawTitle('Thumbnail', y);
      const gap = 3;
      const aspects = thumbnails.map(({ image }) => (image.naturalWidth || image.width) / (image.naturalHeight || image.height));
      const height = Math.min(areaHeight, (contentWidth - gap * (thumbnails.length - 1)) / aspects.reduce((sum, aspect) => sum + aspect, 0));
      let x = margin;
      thumbnails.forEach(({ url }, index) => {
        const width = height * aspects[index];
        doc.addImage(url, imageFormat(url), x, y, width, height);
        x += width + gap;
      });
      y += height + 3;
    }
  }
  if (sketch && sketchHeight > 5) {
    y = drawTitle('Sketch', y);
    const sketchCanvas = document.createElement('canvas');
    sketchCanvas.width = sketch.naturalWidth || sketch.width; sketchCanvas.height = sketch.naturalHeight || sketch.height;
    sketchCanvas.getContext('2d').drawImage(sketch, 0, 0);
    const scale = Math.min(contentWidth / sketchCanvas.width, sketchHeight / sketchCanvas.height);
    const width = sketchCanvas.width * scale; const height = sketchCanvas.height * scale;
    doc.addImage(sketchCanvas.toDataURL('image/png'), 'PNG', margin + (contentWidth - width) / 2, y, width, height);
    doc.setDrawColor(203, 213, 225); doc.rect(margin + (contentWidth - width) / 2, y, width, height);
  }
}
