// Persistent preset catalog initialization and enabled-preset caches.
let cachedCamPresets = [];
let cachedLensPresets = [];
let cachedMovementPresets = [];
let openLensSeries = new Set();

async function initPresets() {
  let cameraRecord = await db.presets.get('camera');
  if (!cameraRecord) {
    cameraRecord = { type: 'camera', list: defaultCameras };
    await db.presets.put(cameraRecord);
  } else {
    const normalized = normalizeCameraPresets(cameraRecord.list);
    if (JSON.stringify(normalized) !== JSON.stringify(cameraRecord.list)) {
      cameraRecord = { ...cameraRecord, list: normalized };
      await db.presets.put(cameraRecord);
    }
  }
  cachedCamPresets = normalizeCameraPresets(cameraRecord.list).filter(camera => camera.enabled);

  let lensRecord = await db.presets.get('lens');
  if (!lensRecord) {
    lensRecord = { type: 'lens', list: defaultLenses };
    await db.presets.put(lensRecord);
  } else {
    const normalized = normalizeLensPresets(lensRecord.list);
    if (JSON.stringify(normalized) !== JSON.stringify(lensRecord.list)) {
      lensRecord = { ...lensRecord, list: normalized };
      await db.presets.put(lensRecord);
    }
  }
  cachedLensPresets = normalizeLensPresets(lensRecord.list).filter(lens => lens.enabled);

  let movementRecord = await db.presets.get('movement');
  if (!movementRecord) {
    movementRecord = { type: 'movement', list: defaultMovements };
    await db.presets.put(movementRecord);
  } else {
    const normalized = normalizeMovementPresets(movementRecord.list);
    if (JSON.stringify(normalized) !== JSON.stringify(movementRecord.list)) {
      movementRecord = { ...movementRecord, list: normalized };
      await db.presets.put(movementRecord);
    }
  }
  cachedMovementPresets = normalizeMovementPresets((await db.presets.get('movement')).list).filter(item => item.enabled);
  renderCameraTabs();
}
