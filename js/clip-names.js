// Clip candidates are hints only; selecting one is the only way they fill a field.
import { db } from './database.js';
import { state } from './state.js';
import { getCameraReelName, referenceClipFields } from './camera-model.js';

export function normalizeReel(value) {
  const text = String(value ?? '').trim();
  return /^\d{1,3}$/.test(text) ? text.padStart(3, '0') : text;
}

export function getClipNameBase(camera, reel) {
  const number = normalizeReel(reel);
  return `${getCameraReelName(camera)}${/^\d{3}$/.test(number) ? number : '___'}C`;
}

function getNextCameraClipName(camera, base, excludeKey = null) {
  const keys = ['clip_name', ...Object.entries(referenceClipFields).filter(([flag]) => camera[flag] === 'YES').map(([, key]) => key)];
  let latest = null;
  for (const key of keys) {
    if (key === excludeKey) continue;
    const clip = String(camera[key] || '').trim().toUpperCase();
    if (!clip.startsWith(base)) continue;
    const suffix = clip.slice(base.length);
    if (!/^\d+$/.test(suffix) || !Number.isSafeInteger(Number(suffix) + 1)) continue;
    const number = Number(suffix);
    if (!latest || number > latest.number || (number === latest.number && suffix.length > latest.width)) latest = { number, width: suffix.length };
  }
  return latest ? `${base}${String(latest.number + 1).padStart(Math.max(3, latest.width), '0')}` : '';
}

export function getNextReferenceClipName(camera, reel, fieldKey, primarySuggestion = '') {
  if (!Object.values(referenceClipFields).includes(fieldKey) || !/^\d{3}$/.test(normalizeReel(reel))) return '';
  return getNextCameraClipName({
    ...camera,
    clip_name: String(camera.clip_name || '').trim() || primarySuggestion
  }, getClipNameBase(camera, reel), fieldKey);
}

export function getNextClipName(records, { camera, reel, date, showTitle, beforeId = null }) {
  const number = normalizeReel(reel);
  if (!/^\d{3}$/.test(number) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return '';
  const name = getCameraReelName(camera);
  const base = getClipNameBase(camera, number);
  const previous = records.filter(record =>
    (!beforeId || record.id < beforeId)
    && String(record.shoot_datetime || '').slice(0, 10) === date
    && String(record.show_title || '').trim() === String(showTitle || '').trim()
    && (!record.reel || normalizeReel(record.reel) === number)
  ).sort((left, right) => right.id - left.id);
  for (const record of previous) {
    for (const savedCamera of record.cameras || []) {
      if (getCameraReelName(savedCamera) !== name) continue;
      const next = getNextCameraClipName(savedCamera, base);
      if (next) return next;
    }
  }
  return `${base}001`;
}

let generation = 0;

export async function refreshClipNameSuggestions() {
  const current = ++generation;
  const session = state.editorSession;
  const reel = document.getElementById('reel').value;
  const date = document.getElementById('shoot_datetime').value.slice(0, 10);
  const showTitle = document.getElementById('show_title').value;
  const cameras = state.cameraListState.map(camera => ({ ...camera }));
  const fields = cameras.flatMap((camera, index) => ['clip_name', ...Object.values(referenceClipFields)].map(key => {
    const input = document.getElementById(`camera_${index}_${key}`);
    const options = document.querySelector(`#camera_${index}_${key}Popover .camera-setting-options`);
    if (input) input.placeholder = key === 'clip_name' ? `${getClipNameBase(camera, reel)}001` : 'Clip Name';
    if (options) options.textContent = 'Loading candidate...';
    return { input, options, index, key };
  }));
  try {
    const records = await db.sheets.toArray();
    if (current !== generation || session !== state.editorSession) return;
    const primarySuggestions = cameras.map(camera => getNextClipName(records, { camera, reel, date, showTitle, beforeId: state.currentEditingId }));
    fields.forEach(({ input, options, index, key }) => {
      if (!input?.isConnected || !options?.isConnected) return;
      const suggestion = key === 'clip_name' ? primarySuggestions[index] : getNextReferenceClipName(cameras[index], reel, key, primarySuggestions[index]);
      if (!suggestion) {
        options.textContent = key === 'clip_name'
          ? 'Set Date & Time and a three-digit Reel to see a candidate.'
          : 'Enter a matching Clip Name and a three-digit Reel to see a candidate.';
        return;
      }
      input.placeholder = suggestion;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'camera-setting-option';
      button.dataset.action = 'set-camera-setting';
      button.dataset.fieldKey = key;
      button.dataset.settingValue = suggestion;
      button.textContent = suggestion;
      button.title = key === 'clip_name'
        ? 'Next clip from the preceding matching sheet, including enabled references; C001 if none exists'
        : 'Next number after the camera Clip Name and other entered references';
      options.replaceChildren(button);
    });
  } catch {
    if (current !== generation || session !== state.editorSession) return;
    fields.forEach(({ options }) => {
      if (options?.isConnected) options.textContent = 'Could not read previous sheets. Enter Clip Name manually.';
    });
  }
}
