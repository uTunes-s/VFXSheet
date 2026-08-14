// Normalization and ordering rules for camera, lens, and movement presets.
import { defaultCameras } from './preset-catalog-cameras.js';
import { defaultLenses } from './preset-catalog-lenses.js';
import { defaultMovements, presetCategories } from './preset-catalog-meta.js';

const retiredCameraPresetNames = new Set([
  'Freefly Ember S35', 'Freefly Wave 4K', 'Sony Venice 6K FF35',
  'Sony Venice II 6K', 'Sony Venice II 8.6K'
]);
const sonyVeniceCameraOrder = [
  'Sony Venice FF 6K 3:2', 'Sony Venice FF 5.7K 16:9',
  'Sony Venice S35 4K 17:9', 'Sony Venice S35 3.8K 16:9',
  'Sony Venice II FF 8.6K 3:2', 'Sony Venice II FF 8.1K 16:9',
  'Sony Venice II FF 7.6K 16:9', 'Sony Venice II S35 5.8K 6:5',
  'Sony Venice II S35 5.4K 16:9'
];

export function getLensSeries(lens) {
  if (lens.series) return lens.series;
  const name = lens.name || '';
  const prefixes = [
    ['ARRI Master Prime', 'ARRI Master Prime'], ['ARRI Signature Prime', 'ARRI Signature Prime'],
    ['ARRI Signature Zoom', 'ARRI Signature Zoom'], ['Cooke S4/i', 'Cooke S4/i'],
    ['Cooke Panchro', 'Cooke Panchro Classic'], ['Angénieux Optimo Prime', 'Angénieux Optimo Prime'],
    ['Angénieux Optimo', 'Angénieux Optimo'], ['ZEISS CP.2', 'ZEISS CP.2'],
    ['ZEISS CP.3', 'ZEISS CP.3'], ['ZEISS Compact Zoom', 'ZEISS Compact Zoom CZ.2'],
    ['Sony FE', 'Sony FE'], ['Canon RF', 'Canon RF'], ['DJI Inspire 3', 'DJI Inspire 3 DL'],
    ['iPhone 15', 'iPhone 15 Pro']
  ];
  return prefixes.find(([prefix]) => name.startsWith(prefix))?.[1] || name.split(' ').slice(0, 2).join(' ');
}

export function normalizeCameraPresets(list = []) {
  const byName = new Map();
  [...defaultCameras, ...list].forEach(item => {
    const normalized = typeof item === 'string'
      ? { name: item, category: 'Custom', enabled: true }
      : { name: item.name, category: item.category || 'Cine', enabled: item.enabled !== false };
    if (!normalized.name || retiredCameraPresetNames.has(normalized.name)) return;
    const existing = byName.get(normalized.name);
    byName.set(normalized.name, existing ? { ...existing, ...normalized } : normalized);
  });
  return [...byName.values()].sort((a, b) => {
    const aIndex = sonyVeniceCameraOrder.indexOf(a.name);
    const bIndex = sonyVeniceCameraOrder.indexOf(b.name);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    return a.name.localeCompare(b.name);
  });
}

export function normalizeLensPresets(list = []) {
  const byName = new Map();
  [...defaultLenses, ...list].forEach(item => {
    const normalized = { name: item.name, focal: item.focal || '', category: item.category || 'Cine', series: getLensSeries(item), enabled: item.enabled !== false };
    if (!normalized.name) return;
    byName.set(normalized.name, { ...(byName.get(normalized.name) || {}), ...normalized });
  });
  const focalValue = lens => Number.parseFloat(String(lens.focal || lens.name).match(/\d+(?:\.\d+)?/)?.[0]) || Number.POSITIVE_INFINITY;
  return [...byName.values()].sort((a, b) =>
    presetCategories.indexOf(a.category) - presetCategories.indexOf(b.category)
    || getLensSeries(a).localeCompare(getLensSeries(b))
    || focalValue(a) - focalValue(b)
    || a.name.localeCompare(b.name)
  );
}

export function normalizeMovementPresets(list = []) {
  const byName = new Map();
  [...defaultMovements, ...list].forEach(item => {
    const normalized = typeof item === 'string' ? { name: item, enabled: true } : { name: item.name, enabled: item.enabled !== false };
    if (normalized.name) byName.set(normalized.name, { ...(byName.get(normalized.name) || {}), ...normalized });
  });
  return [...byName.values()];
}

// Public APIs are exposed only through named ES module exports.

