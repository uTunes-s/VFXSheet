// Japanese PDF font setup and invisible searchable text layer generation.
import { state } from './state.js';
import { getCameraFieldLabel } from './camera-model.js';

export async function addInvisiblePdfTextLayer(doc, record) {
  await loadJapanesePdfFont(doc);
  const cameraText = (record.cameras || []).map(camera => [
    getCameraFieldLabel(camera), camera.camera, camera.lens, camera.focal_length,
    camera.t_stop, camera.clip_name, camera.cramerawork, camera.lut_info,
    camera.shutter_speed, camera.frame_rate, camera.iso_ei, camera.white_balance,
    camera.nd_filter, camera.height_value, camera.distance_value, camera.tilt_value
  ].filter(Boolean).join(' / ')).join('\n');
  const allText = [
    'VFX Sheet', `Record #${record.id || ''}`, record.show_title, record.operator,
    record.shoot_datetime, record.location, record.gps_location, record.episode,
    record.scene, record.shot, record.hdri_captured,
    Array.isArray(record.hdri_weather) ? record.hdri_weather.join(' / ') : record.hdri_weather,
    record.hdri_notes, cameraText, record.notes
  ].filter(Boolean).join('\n');
  doc.setFontSize(1);
  [...allText].reduce((lines, character) => {
    const lastLine = lines[lines.length - 1];
    if (character === '\n' || [...lastLine].length >= 48) lines.push(character === '\n' ? '' : character);
    else lines[lines.length - 1] += character;
    return lines;
  }, ['']).filter(Boolean).forEach((line, index) => writePdfText(doc, line, 2, 2 + Math.min(index, 250) * 0.01, { renderingMode: 'invisible' }));
}

export async function loadJapanesePdfFont(doc) {
  if (!state.japanesePdfFontPromise) {
    state.japanesePdfFontPromise = fetch(new URL('../vendor/DroidSansFallbackFull.ttf', import.meta.url))
      .then(response => {
        if (!response.ok) throw new Error('Japanese PDF font is unavailable. Please reload once while online.');
        return response.arrayBuffer();
      })
      .then(buffer => {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
        return binary;
      });
  }
  const fontData = await state.japanesePdfFontPromise;
  if (!doc.existsFileInVFS('DroidSansFallbackFull.ttf')) {
    doc.addFileToVFS('DroidSansFallbackFull.ttf', fontData);
    doc.addFont('DroidSansFallbackFull.ttf', 'DroidSansJapanese', 'normal', 'Identity-H');
  }
  const font = doc.getFont('DroidSansJapanese', 'normal');
  font.metadata.Unicode = font.metadata.Unicode || { encoding: {}, kerning: {}, widths: { 0: 1000 } };
  font.metadata.Unicode.widths = font.metadata.Unicode.widths || { 0: 1000 };
  font.metadata.Unicode.kerning = font.metadata.Unicode.kerning || {};
}

export function writePdfText(doc, value, x, y, options = {}) {
  const parts = String(value ?? '').match(/[\x00-\xff]+|[^\x00-\xff]+/g) || [];
  let offset = 0;
  parts.forEach(part => {
    doc.setFont(/[^\x00-\xff]/.test(part) ? 'DroidSansJapanese' : 'helvetica', 'normal');
    doc.text(part, x + offset, y, options);
    offset += doc.getTextWidth(part);
  });
  return offset;
}

export function getPdfTextWidth(doc, value) {
  const parts = String(value ?? '').match(/[\x00-\xff]+|[^\x00-\xff]+/g) || [];
  return parts.reduce((width, part) => {
    doc.setFont(/[^\x00-\xff]/.test(part) ? 'DroidSansJapanese' : 'helvetica', 'normal');
    return width + doc.getTextWidth(part);
  }, 0);
}

