// Shared record media and export naming helpers.
function getRecordShotThumbnails(record) {
  return record.shot_thumbnails || (record.shot_thumbnail ? [record.shot_thumbnail] : []);
}

function getShootingDataName(record, camera = {}) {
  return [record.episode, record.scene, record.shot, getCameraReelName(camera)].filter(Boolean).join('_');
}

function formatFlowPtId(id) {
  return String(id ?? '').padStart(5, '0');
}

function getShootingDataExportFilename(record, camera, extension) {
  const date = String(record.shoot_datetime || '').match(/^\d{4}-\d{2}-\d{2}/)?.[0].replaceAll('-', '') || 'undated';
  return `${formatFlowPtId(record.id)}_${getShootingDataName(record, camera)}_${date}.${extension}`;
}
