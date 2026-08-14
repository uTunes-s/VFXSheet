// Printable HTML report section for one VFX Sheet record.
import { escapeHtml } from './utils.js';
import { getCameraFieldLabel } from './camera-model.js';
import { getRecordShotThumbnails } from './export-naming.js';
import { blobToBase64 } from './backup.js';
import { imageFromBlob } from './media-utils.js';
import { renderHighResolutionSketch } from './pdf-canvas-utils.js';

export async function renderPrintableTextPdfRecord(record) {
  const safe = escapeHtml;
  const value = input => safe(input || '-');
  const cameras = record.cameras?.length ? record.cameras : [{ label: 'A', reel_name: 'A' }];
  const thumbnailUrls = await Promise.all(getRecordShotThumbnails(record).map(blobToBase64));
  const sketch = await renderHighResolutionSketch(record) || await imageFromBlob(record.images?.[0]);
  const sketchUrl = sketch ? (() => { const canvas = document.createElement('canvas'); canvas.width = sketch.naturalWidth || sketch.width; canvas.height = sketch.naturalHeight || sketch.height; canvas.getContext('2d').drawImage(sketch, 0, 0); return canvas.toDataURL('image/png'); })() : '';
  return `<section class="page"><div class="report-header"><h1>VFX Sheet</h1><div class="meta">Record #${value(record.id)}</div><div class="header-meta"><div><strong>Operator:</strong> ${value(record.operator)}</div><div><strong>Date &amp; Time:</strong> ${value(record.shoot_datetime)}</div><div><strong>GPS:</strong> ${value(record.gps_location)}</div></div></div><h2>1. General Information</h2><table><tr><th>Show Title</th><td>${value(record.show_title)}</td><th>Episode_Scene_Shot</th><td>${value(record.episode)}_${value(record.scene)}_${value(record.shot)}</td><th>Location</th><td>${value(record.location)}</td></tr></table><h2>2. Multi-Camera Setup</h2><table><tr><th>Reel</th><th>Camera</th><th>Lens / Focal</th><th>T Stop</th><th>Clip</th><th>Movement</th><th>H / D / Tilt</th><th>LUT / Reference</th></tr>${cameras.map(camera => `<tr><td>${value(getCameraFieldLabel(camera))}</td><td>${value(camera.camera)}</td><td>${value(camera.lens)} / ${value(camera.focal_length)}</td><td>${value(camera.t_stop)}</td><td>${value(camera.clip_name)}</td><td>${value(camera.cramerawork)}</td><td>${value(camera.height_value)} / ${value(camera.distance_value)} / ${value(camera.tilt_value)}</td><td>${value(camera.lut_info)}<br>Chart:${value(camera.flag_chart)} Clean:${value(camera.flag_cleanplate)} Ref:${value(camera.flag_reference)}</td></tr>`).join('')}</table><h2>3. HDRI Setup</h2><table><tr><th>Captured</th><td>${value(record.hdri_captured)}</td><th>Weather</th><td>${value(Array.isArray(record.hdri_weather) ? record.hdri_weather.join(' / ') : record.hdri_weather)}</td><th>Notes / EV</th><td>${value(record.hdri_notes)}</td></tr></table><h2>4. VFX Field Notes</h2><table><tr><td><pre>${value(record.notes)}</pre></td></tr></table>${thumbnailUrls.length ? `<h2>Shot Thumbnails</h2><div class="images">${thumbnailUrls.map(url => `<img class="thumb" src="${url}" alt="Shot thumbnail">`).join('')}</div>` : ''}${sketchUrl ? `<h2>Field Sketch</h2><img class="sketch" src="${sketchUrl}" alt="Field sketch">` : ''}</section>`;
}

