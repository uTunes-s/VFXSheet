// Persistent preset catalog initialization and enabled-preset caches.
import { db } from './database.js';
import { defaultCameras } from './preset-catalog-cameras.js';
import { defaultLenses } from './preset-catalog-lenses.js';
import { defaultMovements } from './preset-catalog-meta.js';
import { normalizeCameraPresets, normalizeLensPresets, normalizeMovementPresets } from './preset-normalizers.js';

export let cachedCamPresets = [];
export let cachedLensPresets = [];
export let cachedMovementPresets = [];
export const openLensSeries = new Set();

export async function initPresets() {
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

Object.defineProperties(globalThis, {
  cachedCamPresets: { configurable: true, get: () => cachedCamPresets },
  cachedLensPresets: { configurable: true, get: () => cachedLensPresets },
  cachedMovementPresets: { configurable: true, get: () => cachedMovementPresets },
  openLensSeries: { configurable: true, get: () => openLensSeries }
});
globalThis.initPresets = initPresets;
