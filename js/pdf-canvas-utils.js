// Raster PDF page drawing helpers and high-resolution Fabric sketch rendering.
export async function renderHighResolutionSketch(record) {
  if (!record.canvas_json || !window.fabric) return null;
  const element = document.createElement('canvas');
  const staticCanvas = new fabric.StaticCanvas(element, { width: 760, height: 480, backgroundColor: '#090d16' });
  try {
    const dataUrl = await new Promise((resolve, reject) => {
      staticCanvas.loadFromJSON(record.canvas_json, () => {
        try {
          staticCanvas.renderAll();
          resolve(staticCanvas.toDataURL({ format: 'png', multiplier: 3 }));
        } catch (error) { reject(error); }
      });
    });
    return await imageFromDataUrl(dataUrl);
  } catch (error) {
    console.info('High-resolution sketch rendering unavailable.', error);
    return null;
  } finally {
    staticCanvas.dispose();
  }
}

export function imageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });
}

export function drawPdfSectionTitle(ctx, title, y) {
  ctx.fillStyle = '#b45309'; ctx.font = 'bold 18px sans-serif'; ctx.fillText(title, 40, y);
  return y + 14;
}

export function drawPdfHeaderMeta(ctx, record) {
  const values = [['Operator', record.operator], ['Show Title', record.show_title], ['Date & Time', record.shoot_datetime], ['GPS', record.gps_location]];
  const width = 270; const x = 1200 - width; const labelWidth = 88;
  ctx.font = 'bold 11px sans-serif';
  values.forEach(([label, value], index) => {
    const y = 26 + index * 20;
    ctx.fillStyle = '#94a3b8'; ctx.fillText(label, x, y);
    ctx.fillStyle = '#334155'; ctx.font = '12px sans-serif';
    const text = wrapPdfText(ctx, String(value || '-'), width - labelWidth).slice(0, 1)[0] || '-';
    ctx.fillText(text, x + labelWidth, y);
    ctx.font = 'bold 11px sans-serif';
  });
}

export function drawPdfTable(ctx, y, rows, columns) {
  const x = 40; const width = 1160; const cellWidth = width / columns; const cellHeight = 54;
  rows.forEach(row => {
    row.forEach((cell, index) => {
      const cellX = x + index * cellWidth;
      ctx.fillStyle = '#f8fafc'; ctx.fillRect(cellX, y, cellWidth, cellHeight);
      ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1; ctx.strokeRect(cellX, y, cellWidth, cellHeight);
      ctx.fillStyle = '#64748b'; ctx.font = 'bold 12px sans-serif'; ctx.fillText(cell.label, cellX + 8, y + 16);
      ctx.fillStyle = '#0f172a'; ctx.font = '15px sans-serif';
      const lines = wrapPdfText(ctx, String(cell.value || '-'), cellWidth - 16).slice(0, 2);
      lines.forEach((line, lineIndex) => ctx.fillText(line, cellX + 8, y + 35 + lineIndex * 15));
    });
    y += cellHeight;
  });
  return y;
}

export function drawPdfCameraTable(ctx, y, camera, number) {
  ctx.fillStyle = '#334155'; ctx.fillRect(40, y, 1160, 28);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 15px sans-serif'; ctx.fillText(`${camera.label || `Camera ${number}`} — Camera Setup`, 50, y + 19);
  y += 28;
  y = drawPdfTable(ctx, y, [[
    { label: 'Camera', value: camera.camera }, { label: 'Lens', value: camera.lens }, { label: 'Focal Length', value: camera.focal_length }, { label: 'Aperture', value: camera.t_stop }, { label: 'Shutter', value: camera.shutter_speed }, { label: 'Frame Rate', value: camera.frame_rate }, { label: 'ISO / EI', value: camera.iso_ei }, { label: 'White Balance', value: camera.white_balance }
  ]], 8);
  return drawPdfTable(ctx, y, [[
    { label: 'Clip Name', value: camera.clip_name }, { label: 'LUT Info', value: camera.lut_info }, { label: 'Movement', value: camera.cramerawork }, { label: 'ND Filter', value: camera.nd_filter }, { label: 'Lens Height', value: camera.height_value }, { label: 'Target Distance', value: camera.distance_value }, { label: 'Tilt', value: camera.tilt_value || '-' }, { label: 'Chart / Plate / Ref.', value: `Chart:${camera.flag_chart || 'NO'} Plate:${camera.flag_cleanplate || 'NO'} Ref:${camera.flag_reference || 'NO'}` }
  ]], 8);
}

export function wrapPdfText(ctx, text, maxWidth) {
  return text.split('\n').flatMap(paragraph => { const lines = []; let line = ''; for (const char of paragraph) { if (ctx.measureText(line + char).width > maxWidth && line) { lines.push(line); line = char; } else line += char; } if (line) lines.push(line); return lines; });
}

export function drawImageContain(ctx, image, x, y, width, height) {
  const ratio = Math.min(width / image.width, height / image.height); const w = image.width * ratio; const h = image.height * ratio;
  ctx.drawImage(image, x + (width - w) / 2, y + (height - h) / 2, w, h);
}

