// On an empty localhost app: await (await import('/tools/browser-regression.js')).runBrowserRegression()
import { db } from '../js/database.js';
import { state } from '../js/state.js';
import { openNewRecordModal, closeEditRecordModal } from '../js/record-modal.js';
import { loadRecordForEdit } from '../js/record-load.js';
import { saveRecord } from '../js/record-save.js';
import { renderList } from '../js/record-list-renderer.js';
import { addShotThumbnails, clearShotThumbnail } from '../js/shot-thumbnails.js';
import { imageFromBlob, readBlobAsDataUrl } from '../js/media-utils.js';
import { createThumbnailCollage } from '../js/thumbnail-collage.js';
import { createShootingDataPdf } from '../js/shooting-data-pdf.js';
import { restoreBackupAssets } from '../js/backup.js';
import { initRecordListPreferences, clearRecordListFilters } from '../js/record-list-filters.js';
import { openAddDefaultsEditor, saveCurrentAsDefaultSettings } from '../js/initial-settings-editor.js';
import { syncData } from '../js/sync.js';
import { openRecordPreview } from '../js/record-preview.js';
import { closeRecordPreview } from '../js/media-modals.js';
import { getNextClipName, refreshClipNameSuggestions } from '../js/clip-names.js';
import { renderPrintableTextPdfRecord } from '../js/pdf-print-record.js';
import { renderTextPdfRecord } from '../js/pdf-text-record.js';

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(predicate) {
  for (let attempt = 0; attempt < 200; attempt++) {
    if (await predicate()) return;
    await delay(10);
  }
  throw new Error('Timed out waiting for the UI.');
}
const input = (id, value) => {
  const element = document.getElementById(id);
  assert(element, `Missing input ${id}`);
  if (element.type === 'checkbox') element.checked = value;
  else element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
};
const click = selector => {
  const element = document.querySelector(selector);
  assert(element, `Missing control ${selector}`);
  element.click();
};

export async function runBrowserRegression() {
  assert(['localhost', '127.0.0.1'].includes(location.hostname), 'Use a disposable localhost browser context.');
  assert(state.fCanvas && !await db.sheets.count() && !await db.presets.get('flowpt_connection'), 'Use an initialized app with no records or FlowPT configuration.');
  const original = { alert: window.alert, confirm: window.confirm, prompt: window.prompt, fetch: window.fetch, defaults: await db.presets.get('user_defaults') };
  const savedSort = localStorage.getItem('vfx-sheet-record-sort');
  const savedView = localStorage.getItem('vfx-sheet-record-view');
  const ids = [];
  const results = [];
  const alerts = [];
  window.alert = message => alerts.push(String(message));
  window.confirm = () => true;
  let promptCount = 0;
  window.prompt = () => { promptCount++; return 'B002'; };
  try {
    await openNewRecordModal();
    input('scene', 'S01');
    input('shot', '010');
    input('camera_0_camera_preset', '__custom__');
    input('camera_0_camera_custom', 'Camera Alpha');
    input('camera_0_clip_name', 'A001C001');
    click('[data-action="add-camera"]');
    input('camera_1_camera_preset', '__custom__');
    input('camera_1_camera_custom', 'Camera Beta');
    input('camera_1_clip_name', 'B001C002');
    click('.camera-card[data-camera-index="1"] [data-action="set-camera-setting"][data-field-key="t_stop"][data-setting-value="T4"]');
    input('camera_1_flag_chart', true);
    const lens = document.getElementById('camera_1_lens_preset');
    const prime = [...lens.options].find(option => option.dataset.focal);
    assert(prime, 'A prime lens preset must be available.');
    input(lens.id, prime.value);
    assert(state.cameraListState[0].clip_name === 'A001C001' && state.cameraListState[1].clip_name === 'B001C002', 'Camera clip inputs crossed.');
    assert(state.cameraListState[1].t_stop === 'T4' && !state.cameraListState[0].t_stop, 'Camera picker wrote to another camera.');
    assert(state.cameraListState[1].focal_length === prime.dataset.focal && !state.cameraListState[0].focal_length, 'Lens preset updated the wrong focal length.');
    assert(new Set([...document.querySelectorAll('[id]')].map(element => element.id)).size === document.querySelectorAll('[id]').length, 'Duplicate camera field IDs.');
    results.push('Camera-scoped inputs, preset pickers, flags and unique IDs');

    await delay(400);
    const reel = document.getElementById('camera_1_heading');
    reel.click();
    assert(promptCount === 0, 'A normal tap must not rename a reel.');
    reel.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, isPrimary: true, button: 0, clientX: 10, clientY: 10 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 30, clientY: 10 }));
    await delay(650);
    assert(promptCount === 0, 'A scrolling gesture must cancel rename.');
    reel.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, isPrimary: true, button: 0, clientX: 10, clientY: 10 }));
    await delay(650);
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    assert(promptCount === 1 && state.cameraListState[1].reel_name === 'B002', 'Long-press rename failed.');
    results.push('Tap safety, movement cancellation and long-press rename');

    const canvas = document.createElement('canvas');
    canvas.width = 120; canvas.height = 80;
    canvas.getContext('2d').fillRect(0, 0, 120, 80);
    const png = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const file = new File([png], 'reference.png', { type: 'image/png' });
    await addShotThumbnails({ target: { files: [file, file], value: '' } });
    assert(state.pendingShotThumbnails.length === 2 && !(state.pendingShotThumbnails[0] instanceof File), 'File picker bytes must be saved as independent Blobs.');
    let finishRead;
    const reading = new Promise(resolve => { finishRead = resolve; });
    const slowFile = new File([png], 'slow.png', { type: 'image/png' });
    slowFile.arrayBuffer = async () => { await reading; return png.arrayBuffer(); };
    const pending = addShotThumbnails({ target: { files: [slowFile], value: '' } });
    await saveRecord(null, 'new');
    assert(!await db.sheets.count(), 'Saving must wait for file-picker bytes.');
    clearShotThumbnail();
    finishRead();
    await pending;
    assert(!state.pendingShotThumbnails.length, 'Clearing thumbnails must cancel pending file additions.');
    await addShotThumbnails({ target: { files: [file, file], value: '' } });
    results.push('Pending image reads block saving and cannot undo a later Clear');
    click('[data-action="open-floating-thumbnail"]');
    await until(() => document.getElementById('floatingThumbnailImage').getAttribute('src'));
    click('[data-viewer-action="zoom-in"]');
    assert(document.getElementById('floatingThumbnailZoom').textContent === '125%', 'Viewer zoom failed.');
    click('[data-viewer-action="next"]');
    assert(document.getElementById('floatingThumbnailCount').textContent === '2 / 2', 'Viewer image switching failed.');
    input('camera_0_clip_name', 'A001C003');
    assert(!document.getElementById('floatingThumbnailViewer').hidden && state.cameraListState[0].clip_name === 'A001C003', 'Viewer must not block form editing.');
    click('[data-viewer-action="minimize"]');
    assert(document.getElementById('floatingThumbnailViewer').classList.contains('is-minimized'), 'Viewer minimize failed.');
    click('[data-viewer-action="minimize"]');
    results.push('File materialization and non-modal viewer zoom/switch/minimize');

    await saveRecord(null, 'new');
    const first = await db.sheets.toCollection().first();
    ids.push(first.id);
    const before = await Promise.all(first.shot_thumbnails.map(blob => blob.arrayBuffer()));
    assert(first.cameras[1].reel_name === 'B002' && first.cameras[1].flag_chart === 'YES', 'Camera metadata was lost on save.');
    for (let cycle = 0; cycle < 3; cycle++) {
      await loadRecordForEdit(first.id);
      await until(() => !state.isUndoRedo);
      input('notes', `Edit ${cycle}`);
      await saveRecord(null, 'update');
      const saved = await db.sheets.get(first.id);
      assert(saved.uuid === first.uuid && saved.shot_thumbnails.length === 2, 'Edit lost UUID or thumbnails.');
      for (let index = 0; index < 2; index++) {
        const bytes = await saved.shot_thumbnails[index].arrayBuffer();
        assert(new Uint8Array(bytes).every((byte, position) => byte === new Uint8Array(before[index])[position]), 'Edit changed thumbnail bytes.');
      }

      await renderList();
      assert(document.querySelectorAll('.record-thumbnail-image').length === 2 && !document.querySelector('.thumbnail-unavailable'), 'Edit lost list thumbnails.');
    }
    results.push('Three edit/update cycles preserve image bytes, UUID and list thumbnails');

    state.selectedRecordIds.add(first.id);
    click('[data-action="set-record-view"][data-view="tiles"]');
    await until(() => document.getElementById('recordList').classList.contains('record-tiles'));
    await renderList();
    assert(document.querySelector('[data-action="toggle-record-selection"]').checked, 'View switching lost selection.');
    assert(document.querySelector('.record-card-media').textContent.includes('B002'), 'Tiles must identify the reels.');
    state.recordListView = 'list';
    initRecordListPreferences();
    assert(state.recordListView === 'tiles', 'Tile preference was not persisted.');
    click('[data-action="set-record-view"][data-view="list"]');
    await renderList();
    results.push('List/tile switching preserves selection and remembers display preference');

    const persisted = await db.sheets.get(first.id);
    const collage = await createThumbnailCollage(persisted.shot_thumbnails);
    assert(collage?.type === 'image/jpeg' && collage.size > 0, 'Persisted thumbnails cannot create a collage.');
    const pdf = await createShootingDataPdf(persisted, persisted.cameras[0]);
    assert(new TextDecoder().decode(pdf.slice(0, 4)) === '%PDF', 'Persisted thumbnails cannot create the sync PDF.');
    const assets = await restoreBackupAssets({ images: [], shot_thumbnail: null, shot_thumbnails: await Promise.all(persisted.shot_thumbnails.map(readBlobAsDataUrl)) });
    assert((await imageFromBlob(assets.shot_thumbnails[0])).naturalWidth === 120, 'Backup-restored images cannot be decoded.');
    results.push('Persisted and backup-restored images generate collage JPEG and sync PDF');

    let remoteId = 100;
    const remoteRecords = new Map();
    let remoteWrites = 0;
    window.fetch = async (resource, options = {}) => {
      const url = new URL(typeof resource === 'string' ? resource : resource.url, location.href);
      if (url.origin === location.origin || url.protocol === 'data:') return original.fetch(resource, options);
      assert(url.origin === 'https://flowpt.invalid', 'Unexpected external request in regression test.');
      const json = body => Promise.resolve(new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } }));
      const path = url.pathname;
      if (path.endsWith('/access_token')) return json({ access_token: 'regression-placeholder' });
      if (path.endsWith('/projects/1')) return json({ data: { id: 1 } });
      if (path.includes('/schema/')) return json({ data: { properties: { valid_values: { value: ['Fix'] } } } });
      if (path.endsWith('/_upload')) return json({ links: { upload: '/mock-upload', complete_upload: '/mock-complete' }, data: {} });
      if (path === '/mock-upload' || path === '/mock-complete') return json({});
      const fields = options.body ? JSON.parse(options.body) : {};
      if (path.endsWith('/custom_entity01s') && (!options.method || options.method === 'GET')) return json({ data: [...remoteRecords.values()].filter(record => record.attributes.sg_vfx_sheet_uuid === url.searchParams.get('filter[sg_vfx_sheet_uuid]')) });
      if (path.endsWith('/custom_entity01s') && options.method === 'POST') {
        remoteWrites++;
        const record = { id: ++remoteId, attributes: fields };
        remoteRecords.set(record.id, record);
        return json({ data: record });
      }
      if (/\/custom_entity01s\/\d+$/.test(path) && options.method === 'PUT') {
        remoteWrites++;
        const record = remoteRecords.get(Number(path.split('/').pop()));
        Object.assign(record.attributes, fields);
        return json({ data: record });
      }
      if (options.method === 'POST') return json({ data: { id: ++remoteId, attributes: { project: { id: 1 } } } });
      if (options.method === 'PUT') return json({ data: {} });
      return json({ data: [] });
    };
    await db.presets.put({ type: 'flowpt_connection', values: { enabled: true, siteUrl: 'https://flowpt.invalid', scriptName: 'regression-placeholder', scriptKey: 'regression-placeholder', targetProject: { id: 1 } } });
    await syncData();
    assert((await db.sheets.get(first.id)).synced === 1 && remoteRecords.size === 2, 'Mocked sync must create one record per camera.');
    await db.sheets.update(first.id, { synced: 0 });
    await syncData();
    assert(remoteRecords.size === 2, 'Retry created duplicate UUID-scoped remote records.');
    const writesBeforeCorruption = remoteWrites;
    await db.sheets.update(first.id, { synced: 0, shot_thumbnails: [new Blob(['broken'], { type: 'image/png' })] });
    await syncData();
    const failed = await db.sheets.get(first.id);
    assert(remoteWrites === writesBeforeCorruption && !failed.synced && failed.syncError.includes('Thumbnail 1'), 'A bad local image must stop sync before remote writes and identify the image.');
    await renderList();
    assert(document.querySelector('.thumbnail-unavailable'), 'A failed image must not disappear silently from the list.');
    await openRecordPreview(first.id);
    assert(!document.getElementById('recordPreviewModal').classList.contains('hidden') && document.querySelector('#recordPreviewModalContent [role="status"]').textContent.includes('Thumbnail 1'), 'Corrupt images must not block record details.');
    closeRecordPreview();
    await db.sheets.update(first.id, { shot_thumbnails: persisted.shot_thumbnails });
    results.push('Mocked FlowPT create/retry is idempotent; corrupt images stop before remote writes');
    window.fetch = original.fetch;

    await loadRecordForEdit(first.id);
    await until(() => !state.isUndoRedo);
    clearShotThumbnail();
    await saveRecord(null, 'update');
    assert((await db.sheets.get(first.id)).shot_thumbnails.length === 0, 'Clearing all thumbnails resurrected old images.');
    await db.sheets.update(first.id, { shot_thumbnails: persisted.shot_thumbnails });
    await loadRecordForEdit(first.id);
    await until(() => !state.isUndoRedo);
    state.pendingShotThumbnails = [new Blob(['broken'], { type: 'image/png' })];
    await saveRecord(null, 'update');
    assert(state.isEditingInModal && (await db.sheets.get(first.id)).shot_thumbnails.length === 2, 'A failed image save must preserve the prior record and keep the editor open.');
    closeEditRecordModal(true);
    results.push('Intentional thumbnail clearing persists; failed image saves preserve old data');

    await openAddDefaultsEditor();
    click('[data-action="add-camera"]');
    input('camera_0_clip_name', 'DEFAULT_A');
    input('camera_1_clip_name', 'DEFAULT_B');
    await saveCurrentAsDefaultSettings();
    await openNewRecordModal();
    assert(state.cameraListState.length === 2 && state.cameraListState[1].clip_name === 'DEFAULT_B', 'Per-camera defaults were lost.');
    closeEditRecordModal(true);
    await openAddDefaultsEditor();
    click('.camera-card[data-camera-index="0"] [data-action="remove-camera"]');
    await saveCurrentAsDefaultSettings();
    await openNewRecordModal();
    assert(state.cameraListState.length === 1 && state.cameraListState[0].clip_name === 'DEFAULT_B', 'Removing a camera did not remap its default-field toggles.');
    results.push('Multiple camera defaults and removal preserve the correct field mappings');
    return { passed: results.length, results };
  } finally {
    window.fetch = original.fetch;
    closeEditRecordModal(true);
    for (const id of ids) await db.sheets.delete(id);
    await db.presets.delete('flowpt_connection');
    if (original.defaults) await db.presets.put(original.defaults);
    else await db.presets.delete('user_defaults');
    for (const [key, value] of [['vfx-sheet-record-sort', savedSort], ['vfx-sheet-record-view', savedView]]) {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    }
    state.selectedRecordIds.clear();
    clearRecordListFilters();
    initRecordListPreferences();
    await renderList();
    window.alert = original.alert;
    window.confirm = original.confirm;
    window.prompt = original.prompt;
  }
}

export async function runReelRegression() {
  assert(['localhost', '127.0.0.1'].includes(location.hostname), 'Use a disposable localhost browser context.');
  assert(state.fCanvas && !await db.sheets.count() && !await db.presets.get('flowpt_connection'), 'Use an initialized app with no records or FlowPT configuration.');
  const original = { alert: window.alert, confirm: window.confirm, defaults: await db.presets.get('user_defaults') };
  const ids = [];
  const results = [];
  window.alert = () => {};
  window.confirm = () => true;
  const add = async record => {
    const id = await db.sheets.add({ uuid: crypto.randomUUID(), ...record });
    ids.push(id);
    return id;
  };
  try {
    await db.presets.put({ type: 'user_defaults', values: { cameras: [{ label: 'Z', reel_name: 'Z' }], enabled_fields: { camera_0_camera_preset: false, camera_0_clip_name: false } } });
    await openAddDefaultsEditor();
    assert(document.getElementById('camera_0_heading').value === 'Z', 'Defaults must retain cameras even when their other fields are OFF.');
    input('camera_0_heading', 'b');
    input('reel', '95');
    await saveCurrentAsDefaultSettings();
    await openNewRecordModal();
    assert(state.cameraListState[0].reel_name === 'B' && document.getElementById('reel').value === '095', 'Name-only and three-digit Reel defaults were not retained.');
    await refreshClipNameSuggestions();
    assert(document.getElementById('camera_0_clip_name').placeholder === 'B095C001', 'Reel defaults did not reach the Clip Name hint.');
    results.push('Name-only camera defaults and zero-padded Reel defaults persist');

    input('scene', 'S01');
    input('shot', '001');
    await saveRecord(null, 'new');
    const first = await db.sheets.toCollection().first();
    ids.push(first.id);
    assert(first.reel === '095', 'Sheet Reel was not saved.');
    await loadRecordForEdit(first.id);
    await until(() => !state.isUndoRedo);
    input('reel', '7');
    await saveRecord(null, 'update');
    await loadRecordForEdit(first.id, true);
    await until(() => !state.isUndoRedo);
    assert(document.getElementById('reel').value === '007', 'Edit/duplicate lost Reel.');
    closeEditRecordModal(true);
    results.push('Reel survives record creation, editing and duplication');

    const previous = await add({ show_title: 'REEL TEST', shoot_datetime: '2026-03-15T10:00', reel: '095', cameras: [{ reel_name: 'B', clip_name: 'B095C007' }, { reel_name: 'C', clip_name: 'C095C003' }] });
    await add({ show_title: 'OTHER SHOW', shoot_datetime: '2026-03-15T10:01', reel: '095', cameras: [{ reel_name: 'B', clip_name: 'B095C090' }] });
    await add({ show_title: 'REEL TEST', shoot_datetime: '2026-03-16T10:02', reel: '095', cameras: [{ reel_name: 'B', clip_name: 'B095C099' }] });
    await add({ show_title: 'REEL TEST', shoot_datetime: '2026-03-15T10:03', reel: '096', cameras: [{ reel_name: 'B', clip_name: 'B096C055' }] });
    await add({ show_title: 'REEL TEST', shoot_datetime: '2026-03-15T10:04', reel: '095', cameras: [{ reel_name: 'A', clip_name: 'A095C088' }] });
    await openNewRecordModal();
    input('show_title', 'REEL TEST');
    input('shoot_datetime', '2026-03-15T11:00');
    click('[data-action="add-camera"]');
    await refreshClipNameSuggestions();
    assert(document.getElementById('camera_0_clip_name').placeholder === 'B095C008', 'Candidate ignored the selected date, show, Reel or camera.');
    assert(document.getElementById('camera_1_clip_name').placeholder === 'C095C004', 'The second camera used another camera clip number.');
    click('#camera_0_clip_name');
    await until(() => document.querySelector('#camera_0_clip_namePopover [data-setting-value="B095C008"]'));
    click('#camera_0_clip_namePopover [data-setting-value="B095C008"]');
    assert(state.cameraListState[0].clip_name === 'B095C008' && !state.cameraListState[1].clip_name, 'Selecting a clip suggestion wrote to the wrong camera.');
    input('reel', '96');
    await refreshClipNameSuggestions();
    assert(document.getElementById('camera_0_clip_name').value === 'B095C008' && document.getElementById('camera_0_clip_name').placeholder === 'B096C056', 'Changing Reel overwrote a manually chosen clip.');
    closeEditRecordModal(true);
    results.push('Capture date, show, Reel and camera isolate popup hints without overwriting input');

    await loadRecordForEdit(previous);
    await until(() => !state.isUndoRedo);
    await refreshClipNameSuggestions();
    assert(document.getElementById('camera_0_clip_name').placeholder === 'B095C001' && document.getElementById('camera_0_clip_name').value === 'B095C007', 'Editing must exclude the current and later sheets from candidates.');
    closeEditRecordModal(true);
    const query = { camera: { reel_name: 'B' }, reel: '095', date: '2026-03-15', showTitle: 'REEL TEST' };
    const legacy = { id: 1, show_title: query.showTitle, shoot_datetime: `${query.date}T10:00`, cameras: [{ reel_name: 'B', clip_name: 'B095C999' }] };
    assert(getNextClipName([legacy], query) === 'B095C1000', 'Legacy sheets or clip-number overflow were mishandled.');
    assert(getNextClipName([{ ...legacy, id: 2, cameras: [{ reel_name: 'B', clip_name: 'B095C003' }] }, legacy], query) === 'B095C004', 'Use the preceding sheet, not the greatest clip number.');
    assert(!getNextClipName([legacy], { ...query, reel: 'bad' }), 'Invalid Reel must not produce a candidate.');
    results.push('Editing excludes later sheets; legacy clip names and C999 increments remain supported');
    const withReferences = {
      ...legacy, id: 2, reel: '095',
      cameras: [{
        reel_name: 'B', clip_name: 'B095C007',
        flag_chart: 'YES', chart_clip_name: 'B095C010',
        flag_cleanplate: 'YES', cleanplate_clip_name: 'B095C009',
        flag_reference: 'NO', reference_clip_name: 'B095C099'
      }]
    };
    assert(getNextClipName([withReferences], query) === 'B095C011', 'Next-sheet inference must include the highest enabled reference, not a retained NO clip.');
    const otherFormats = { ...withReferences, cameras: [{ ...withReferences.cameras[0], chart_clip_name: 'A095C080', cleanplate_clip_name: 'B096C090' }] };
    assert(getNextClipName([otherFormats], query) === 'B095C008', 'Reference clips from another camera or Reel must not affect numbering.');
    const referenceOnly = { ...withReferences, cameras: [{ reel_name: 'B', flag_chart: 'YES', chart_clip_name: 'B095C999' }] };
    assert(getNextClipName([referenceOnly], query) === 'B095C1000', 'A reference-only preceding sheet must support clip-number overflow.');
    assert(getNextClipName([referenceOnly, { ...withReferences, id: 3 }], query) === 'B095C011', 'References must not change the preceding-sheet rule into a greatest-ever-number rule.');
    results.push('Enabled references extend next-sheet inference while preserving camera, Reel and preceding-sheet boundaries');
    return { passed: results.length, results };
  } finally {
    closeEditRecordModal(true);
    for (const id of ids) await db.sheets.delete(id);
    if (original.defaults) await db.presets.put(original.defaults);
    else await db.presets.delete('user_defaults');
    await renderList();
    window.alert = original.alert;
    window.confirm = original.confirm;
  }
}

export async function runReferenceRegression() {
  assert(['localhost', '127.0.0.1'].includes(location.hostname), 'Use a disposable localhost browser context.');
  assert(state.fCanvas && !await db.sheets.count() && !await db.presets.get('flowpt_connection'), 'Use an initialized app with no records or FlowPT configuration.');
  const original = { alert: window.alert, confirm: window.confirm, defaults: await db.presets.get('user_defaults') };
  const ids = [];
  const results = [];
  window.alert = () => {};
  window.confirm = () => true;
  const referenceFields = [
    ['flag_chart', 'chart_clip_name', 'A095C002'],
    ['flag_cleanplate', 'cleanplate_clip_name', 'A095C003'],
    ['flag_reference', 'reference_clip_name', 'A095C004']
  ];
  const isHidden = (index, key) => document.getElementById(`camera_${index}_${key}Wrap`).hidden;
  try {
    await db.presets.delete('user_defaults');
    await openNewRecordModal();
    assert(document.getElementById('location').parentElement.nextElementSibling.querySelector('#reel'), 'General Reel must immediately follow Location.');
    const modelRow = document.getElementById('camera_0_heading').closest('.cam-row-model');
    assert(modelRow?.contains(document.getElementById('camera_0_camera_preset')) && modelRow.contains(document.getElementById('camera_0_lens_preset')), 'Camera reel name must share the model/lens row.');
    input('scene', 'REFERENCE');
    input('shot', '001');
    input('reel', '095');
    input('camera_0_clip_name', 'A095C001');
    click('[data-action="add-camera"]');
    for (const [flag, key, value] of referenceFields) {
      assert(isHidden(0, key) && isHidden(1, key), 'NO must initially hide each reference ClipName.');
      input(`camera_0_${flag}`, true);
      assert(!isHidden(0, key) && isHidden(1, key), 'Reference visibility crossed cameras.');
      assert(document.getElementById(`camera_0_${flag}`).closest('.flag-pill').hidden, 'The ClipName editor must replace, not accompany, a YES pill.');
      assert(document.activeElement.id === `camera_0_${key}`, 'Enabling a reference must focus its ClipName editor.');
      await until(() => document.querySelector(`#camera_0_${key}Popover [data-setting-value="${value}"]`));
      assert(!document.getElementById(`camera_0_${key}Popover`).classList.contains('hidden'), 'Enabling a reference must open its candidate popup.');
      click(`#camera_0_${key}Popover [data-setting-value="${value}"]`);
      assert(document.getElementById(`camera_0_${key}`).value === value && !state.cameraListState[1][key], 'Selecting a reference candidate wrote to the wrong field or camera.');
    }
    input('camera_0_clip_name', 'A095C010');
    await refreshClipNameSuggestions();
    assert(document.querySelector('#camera_0_chart_clip_namePopover [data-setting-value="A095C011"]') && document.getElementById('camera_0_chart_clip_name').value === 'A095C002', 'Changing the primary clip must refresh hints without overwriting entered reference clips.');
    input('camera_0_clip_name', 'A095C001');
    input('camera_1_flag_cleanplate', true);
    input('camera_1_cleanplate_clip_name', 'B095C009');
    click('#camera_0_chart_clip_nameWrap [data-action="disable-reference"]');
    assert(isHidden(0, 'chart_clip_name') && document.getElementById('camera_0_chart_clip_name').value === 'A095C002', 'NO must hide without deleting ClipName.');
    assert(!document.getElementById('camera_0_flag_chart').closest('.flag-pill').hidden, 'Setting NO must restore the toggle.');
    assert(state.cameraListState[0].clip_name === 'A095C001' && state.cameraListState[1].cleanplate_clip_name === 'B095C009', 'Reference clips overwrote the primary clip or another camera.');
    click('[data-action="add-camera"]');
    click('.camera-card[data-camera-index="2"] [data-action="remove-camera"]');
    assert(isHidden(0, 'chart_clip_name') && document.getElementById('camera_0_chart_clip_name').value === 'A095C002', 'Camera rerender lost a hidden reference clip.');
    results.push('Inline reference editors replace YES, suggest sequential clips and retain values when reset to NO');

    await saveRecord(null, 'new');
    const first = await db.sheets.toCollection().first();
    ids.push(first.id);
    await loadRecordForEdit(first.id);
    await until(() => !state.isUndoRedo);
    assert(isHidden(0, 'chart_clip_name') && document.getElementById('camera_0_chart_clip_name').value === 'A095C002', 'Save/reopen discarded a hidden ClipName.');
    for (const [, key, value] of referenceFields) assert(document.getElementById(`camera_0_${key}`).value === value, 'A saved reference clip did not round-trip.');
    input('camera_0_flag_chart', true);
    input('camera_0_flag_reference', false);
    assert(!isHidden(0, 'chart_clip_name') && document.getElementById('camera_0_chart_clip_name').value === 'A095C002', 'YES must restore the retained ClipName.');
    await saveRecord(null, 'update');
    await loadRecordForEdit(first.id, true);
    await until(() => !state.isUndoRedo);
    assert(isHidden(0, 'reference_clip_name') && document.getElementById('camera_0_reference_clip_name').value === 'A095C004', 'Update/duplicate discarded a hidden reference clip.');
    closeEditRecordModal(true);
    results.push('Hidden clips persist across create, update, reopen and duplicate');

    const saved = await db.sheets.get(first.id);
    await renderList();
    const listText = document.getElementById('recordList').textContent;
    await openRecordPreview(first.id);
    const previewText = document.getElementById('recordPreviewModalContent').textContent;
    closeRecordPreview();
    const printable = await renderPrintableTextPdfRecord(saved);
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
    const pdfText = [];
    const drawText = doc.text;
    doc.text = function (text, ...args) { pdfText.push(String(text)); return drawText.call(this, text, ...args); };
    await renderTextPdfRecord(doc, saved);
    for (const output of [listText, previewText, printable, pdfText.join('')]) {
      assert(output.includes('A095C002') && output.includes('A095C003') && output.includes('B095C009'), 'Saved view/report omitted enabled reference clips.');
      assert(!output.includes('A095C004'), 'A NO reference must not display its retained clip.');
    }
    assert(doc.output('arraybuffer').byteLength > 0, 'Reference clips must produce a valid PDF.');
    results.push('List, preview, printable report and PDF show only enabled reference clips');

    await openNewRecordModal();
    input('reel', saved.reel);
    input('shoot_datetime', saved.shoot_datetime);
    input('show_title', saved.show_title || '');
    await refreshClipNameSuggestions();
    assert(document.getElementById('camera_0_clip_name').placeholder === 'A095C004', 'The next sheet must start after enabled reference clips, ignoring a retained NO clip.');
    assert(!document.getElementById('camera_0_clip_name').value, 'Next-sheet inference must remain a hint, not automatically fill input.');
    input('camera_0_flag_chart', true);
    await until(() => document.querySelector('#camera_0_chart_clip_namePopover [data-setting-value="A095C005"]'));
    assert(!document.getElementById('camera_0_chart_clip_name').value, 'An empty primary clip may supply a hint, but must not auto-fill references.');
    closeEditRecordModal(true);
    results.push('Next-sheet and reference popups include recorded references without automatically filling fields');

    await db.presets.put({ type: 'user_defaults', values: { cameras: [{ label: 'A', reel_name: 'A' }], enabled_fields: { camera_0_reel_name: true, camera_0_reference_flags: false } } });
    await openAddDefaultsEditor();
    for (const [flag, key, value] of referenceFields) {
      input('initialSetting_camera_0_reference_flags', false);
      input(`camera_0_${flag}`, true);
      assert(document.getElementById('initialSetting_camera_0_reference_flags').checked, 'Each reference flag must enable its defaults group.');
      input('initialSetting_camera_0_reference_flags', false);
      input(`camera_0_${key}`, value);
      assert(document.getElementById('initialSetting_camera_0_reference_flags').checked, 'Each reference ClipName must enable its defaults group.');
    }
    input('camera_0_flag_reference', false);
    input('initialSetting_camera_0_reference_flags', false);
    await saveCurrentAsDefaultSettings();
    assert(!(await db.presets.get('user_defaults')).values.enabled_fields.camera_0_reference_flags, 'Saving must not re-enable an explicitly disabled defaults group.');
    await openNewRecordModal();
    for (const [flag, key] of referenceFields) assert(state.cameraListState[0][flag] === 'NO' && !state.cameraListState[0][key], 'OFF defaults must reset flags and reference clips together.');
    closeEditRecordModal(true);
    await openAddDefaultsEditor();
    for (const [, key, value] of referenceFields) assert(document.getElementById(`camera_0_${key}`).value === value, 'Disabled defaults must retain their editable reference clips.');
    input('initialSetting_camera_0_reference_flags', true);
    await saveCurrentAsDefaultSettings();
    await openNewRecordModal();
    for (const [, key, value] of referenceFields) assert(state.cameraListState[0][key] === value, 'Enabled reference defaults did not apply their ClipNames.');
    assert(isHidden(0, 'reference_clip_name') && state.cameraListState[0].flag_reference === 'NO', 'An enabled group must retain a NO reference clip without showing it.');
    results.push('All reference fields auto-enable defaults; OFF resets and ON restores the complete group');
    return { passed: results.length, results };
  } finally {
    closeEditRecordModal(true);
    closeRecordPreview();
    for (const id of ids) await db.sheets.delete(id);
    if (original.defaults) await db.presets.put(original.defaults);
    else await db.presets.delete('user_defaults');
    await renderList();
    window.alert = original.alert;
    window.confirm = original.confirm;
  }
}
