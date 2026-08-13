// Japanese PDF font setup and invisible searchable text layer generation.
async function addInvisiblePdfTextLayer(doc, record) {
  await loadJapanesePdfFont(doc);
  const cameraText = (record.cameras || []).map(camera => [
    getCameraFieldLabel(camera), camera.camera, camera.lens, camera.focal_length,
    camera.t_stop, camera.clip_name, camera.cramerawork, camera.lut_info,
    camera.height_value, camera.distance_value, camera.tilt_value
  ].filter(Boolean).join(' / ')).join('\n');
  const allText = [
    'VFX Sheet', `Record #${record.id || ''}`, record.show_title, record.operator,
    record.shoot_datetime, record.location, record.gps_location, record.episode,
    record.scene, record.shot, record.hdri_captured,
    Array.isArray(record.hdri_weather) ? record.hdri_weather.join(' / ') : record.hdri_weather,
    record.hdri_notes, cameraText, record.notes
  ].filter(Boolean).join('\n');
  doc.setFont('DroidSansJapanese', 'normal');
  doc.setFontSize(1);
  [...allText].reduce((lines, character) => {
    const lastLine = lines[lines.length - 1];
    if (character === '\n' || [...lastLine].length >= 48) lines.push(character === '\n' ? '' : character);
    else lines[lines.length - 1] += character;
    return lines;
  }, ['']).filter(Boolean).forEach((line, index) => {
    doc.text(line, 2, 2 + Math.min(index, 250) * 0.01, { renderingMode: 'invisible' });
  });
}

async function loadJapanesePdfFont(doc) {
  if (!japanesePdfFontPromise) {
    if (!window.VFX_JAPANESE_PDF_FONT_BASE64) throw new Error('Japanese PDF font is unavailable. Please reload once while online.');
    japanesePdfFontPromise = Promise.resolve(window.VFX_JAPANESE_PDF_FONT_BASE64);
  }
  const fontData = await japanesePdfFontPromise;
  if (!doc.existsFileInVFS('DroidSansJapanese.ttf')) {
    doc.addFileToVFS('DroidSansJapanese.ttf', fontData);
    doc.addFont('DroidSansJapanese.ttf', 'DroidSansJapanese', 'normal', 'Identity-H');
  }
  doc.setFont('DroidSansJapanese', 'normal');
  const font = doc.getFont('DroidSansJapanese', 'normal');
  font.metadata.Unicode = font.metadata.Unicode || { encoding: {}, kerning: {}, widths: { 0: 1000 } };
  font.metadata.Unicode.widths = font.metadata.Unicode.widths || { 0: 1000 };
  font.metadata.Unicode.kerning = font.metadata.Unicode.kerning || {};
}
