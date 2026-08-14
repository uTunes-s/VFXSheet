// FlowPT-compatible CSV, thumbnail, and per-camera PDF ZIP export.
import { getRecordsForHistoryAction } from './record-selection.js';
import { getRecordShotThumbnails, getShootingDataName, getShootingDataExportFilename, formatFlowPtId } from './export-naming.js';
import { createThumbnailCollage } from './thumbnail-collage.js';
import { createShootingDataPdf } from './shooting-data-pdf.js';
import { createZip } from './zip-utils.js';
import { downloadExportBlob } from './media-utils.js';

export async function exportToCSV() {
  const button = document.getElementById('exportCsvBtn');
  const originalLabel = button.innerHTML;
  button.disabled = true;
  button.innerText = 'Creating FlowPT ZIP…';
  try {
    const records = await getRecordsForHistoryAction();
    if (!records || records.length === 0) return alert('No records to export.');

    const headers = ['ID', 'UUID', 'Project', 'Shooting Data Name', 'ThumbText', 'PDF', 'Shoot Day', 'Shoot Place', 'Shoot Time', 'Description', 'Camera', 'Lens', 'Focal Length', 'F-stop', 'ClipName', 'LUT', 'Camerawork', 'Height', 'Distance', 'Angle'];
    const csvEscape = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const formatShootDate = value => {
      const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/);
      return match ? { day: `${match[1]}${match[2]}${match[3]}`, time: `${match[2]}/${match[3]} ${match[4]}:${match[5]}` } : { day: '', time: '' };
    };
    const thumbnails = new Map();
    const shootingDataItems = new Map();
    const rows = records.flatMap(record => {
      const dateTime = formatShootDate(record.shoot_datetime);
      const cameras = record.cameras?.length ? record.cameras : [{}];
      const shotThumbnails = getRecordShotThumbnails(record);
      return cameras.map(camera => {
        const shootingDataName = getShootingDataName(record, camera);
        const thumbnailFilename = getShootingDataExportFilename(record, camera, 'jpg');
        const pdfFilename = getShootingDataExportFilename(record, camera, 'pdf');
        const exportKey = pdfFilename;
        if (shotThumbnails.length && !thumbnails.has(exportKey)) thumbnails.set(exportKey, shotThumbnails);
        if (!shootingDataItems.has(exportKey)) shootingDataItems.set(exportKey, { record, camera, thumbnailFilename, pdfFilename });
        return [
          formatFlowPtId(record.id),
          record.uuid || '',
          record.show_title,
          shootingDataName,
          shotThumbnails.length ? `thumbnails/${thumbnailFilename}` : '',
          `pdfs/${pdfFilename}`,
          dateTime.day,
          record.location,
          dateTime.time,
          record.notes,
          camera.camera,
          camera.lens,
          camera.focal_length,
          camera.t_stop,
          camera.clip_name,
          camera.lut_info,
          camera.cramerawork,
          camera.height_value,
          camera.distance_value,
          camera.tilt_value
        ].map(csvEscape).join(',');
      });
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const thumbnailFiles = (await Promise.all([...thumbnails].map(async ([exportKey, shotThumbnails]) => {
      const collage = await createThumbnailCollage(shotThumbnails);
      const { thumbnailFilename } = shootingDataItems.get(exportKey);
      return collage ? { path: `thumbnails/${thumbnailFilename}`, bytes: new Uint8Array(await collage.arrayBuffer()) } : null;
    }))).filter(Boolean);
    const pdfFiles = [];
    for (const [, { record, camera, pdfFilename }] of shootingDataItems) {
      button.innerText = `Creating PDF ${pdfFiles.length + 1}/${shootingDataItems.size}…`;
      pdfFiles.push({ path: `pdfs/${pdfFilename}`, bytes: await createShootingDataPdf(record, camera) });
    }
    const date = new Date().toISOString().slice(0, 10);
    const zip = createZip([
      { path: `VFX_Sheet_${date}.csv`, bytes: new TextEncoder().encode(csvContent) },
      ...thumbnailFiles,
      ...pdfFiles
    ]);
    downloadExportBlob(zip, `VFX_Sheet_${date}.zip`);
    alert(`FlowPT ZIP exported with ${thumbnailFiles.length} thumbnail file(s) and ${pdfFiles.length} PDF file(s).`);
  } catch (error) {
    console.error('CSV export error:', error);
    alert(`CSV Export Error: ${error.message || error}`);
  } finally {
    button.disabled = false;
    button.innerHTML = originalLabel;
  }
}

Object.assign(globalThis, { exportToCSV });
