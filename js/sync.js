// Direct, idempotent Flow Production Tracking Shooting Data synchronization.
import { db } from './database.js';
import { renderList } from './record-list-renderer.js';
import { getRecordsForHistoryAction } from './record-selection.js';
import { getFlowPtConnection, testFlowPtConnection } from './flowpt-settings.js';
import { getRecordShotThumbnails, getShootingDataExportFilename, getShootingDataName } from './export-naming.js';
import { createThumbnailCollage } from './thumbnail-collage.js';
import { createShootingDataPdf } from './shooting-data-pdf.js';

const FLOWPT_API_VERSION = 'v1.1';
const SHOOTING_DATA_ENDPOINT = 'custom_entity01s';
const UUID_FIELD = 'sg_vfx_sheet_uuid';
const LINKED_ENTITIES = {
  camera: { type: 'Camera', endpoint: 'cameras' },
  lens: { type: 'CustomEntity07', endpoint: 'custom_entity07s' },
  shootDay: { type: 'ShootDay', endpoint: 'shoot_days' },
  shootPlace: { type: 'CustomEntity02', endpoint: 'custom_entity02s' }
};
const LIST_FIELDS = [
  { field: 'sg_lut', label: 'LUT', getValue: camera => cleanText(camera.lut_info) },
  { field: 'sg_camerawork', label: 'カメラワーク', getValue: camera => cleanText(camera.cramerawork) }
];

function flowPtError(body, status) {
  const error = body?.errors?.[0] || body?.error;
  return error?.detail || error?.title || body?.message || `Flow Production Tracking request failed (HTTP ${status}).`;
}

async function requestJson(url, { token, method = 'GET', body } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  let responseBody = null;
  try {
    responseBody = await response.json();
  } catch {
    // Entity upsert endpoints return JSON; retain this guard for useful error handling.
  }
  if (!response.ok) throw new Error(flowPtError(responseBody, response.status));
  return responseBody;
}

function cleanText(value) {
  const text = String(value ?? '').trim();
  return text || undefined;
}

function toFlowPtDateTime(value) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function getProjectId(record) {
  const project = record?.relationships?.project;
  return Number(project?.id ?? project?.data?.id ?? record?.attributes?.project?.id);
}

function makeCameraSyncKey(record, cameraIndex) {
  // A local sheet can contain multiple cameras and produces one Shooting Data record per camera.
  return `${record.uuid}:${cameraIndex + 1}`;
}

function shootDayCode(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}${match[2]}${match[3]}` : undefined;
}

function mapShootingData(record, camera, cameraIndex, links, listFields = {}) {
  const unavailableListValues = Object.values(listFields).filter(result => !result.included);
  const fields = {
    code: getShootingDataName(record, camera),
    [UUID_FIELD]: makeCameraSyncKey(record, cameraIndex),
    description: cleanText(record.notes),
    sg_shoot_time: toFlowPtDateTime(record.shoot_datetime),
    sg_clipname: cleanText(camera.clip_name),
    sg_f_stop: cleanText(camera.t_stop),
    sg_focal_length: cleanText(camera.focal_length),
    sg_angle: cleanText(camera.tilt_value),
    sg_distance: cleanText(camera.distance_value),
    sg_height: cleanText(camera.height_value),
    ...(listFields.sg_camerawork?.included !== false ? { sg_camerawork: cleanText(camera.cramerawork) } : {}),
    ...(listFields.sg_lut?.included !== false ? { sg_lut: cleanText(camera.lut_info) } : {}),
    ...(unavailableListValues.length ? { sg_comment: unavailableListValues.map(result => `${result.label}「${result.value}」はFlowPTの${result.field}リストに登録されていないため、このフィールドには設定していません。`).join(' ') } : {}),
    ...(links.camera ? { sg_camera: links.camera } : {}),
    ...(links.lens ? { sg_lenses: links.lens } : {}),
    ...(links.shootDay ? { sg_shoot_day: links.shootDay } : {})
  };
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
}

function entityReference(entity, id) {
  return { type: entity.type, id };
}

async function findProjectEntityByCode(siteUrl, token, entity, targetProject, code) {
  const query = new URLSearchParams({
    'filter[code]': code,
    'filter[project.Project.id]': String(targetProject.id),
    'page[size]': '2',
    fields: 'code,project'
  });
  const response = await requestJson(`${siteUrl}/api/${FLOWPT_API_VERSION}/entity/${entity.endpoint}?${query}`, { token });
  const records = response?.data || [];
  if (records.length > 1) throw new Error(`More than one ${entity.type} record named "${code}" exists in ${targetProject.name}.`);
  return records[0] || null;
}

async function findOrCreateProjectEntity(siteUrl, token, entity, targetProject, code, extraFields = {}) {
  if (!code) return null;
  const existing = await findProjectEntityByCode(siteUrl, token, entity, targetProject, code);
  if (existing) return entityReference(entity, existing.id);
  const created = await requestJson(`${siteUrl}/api/${FLOWPT_API_VERSION}/entity/${entity.endpoint}?options[fields]=code,project`, {
    token,
    method: 'POST',
    body: { code, project: { type: 'Project', id: targetProject.id }, ...extraFields }
  });
  const record = created?.data;
  if (!record?.id || getProjectId(record) !== targetProject.id) {
    throw new Error(`Flow Production Tracking did not confirm the new ${entity.type} belongs to ${targetProject.name}.`);
  }
  return entityReference(entity, record.id);
}

async function resolveShootingDataLinks(siteUrl, token, targetProject, record, camera) {
  const dayCode = shootDayCode(record.shoot_datetime);
  const shootPlace = await findOrCreateProjectEntity(
    siteUrl,
    token,
    LINKED_ENTITIES.shootPlace,
    targetProject,
    cleanText(record.location)
  );
  const shootDay = await findOrCreateProjectEntity(
    siteUrl,
    token,
    LINKED_ENTITIES.shootDay,
    targetProject,
    dayCode,
    record.shoot_datetime ? { date: toFlowPtDateTime(record.shoot_datetime) } : {}
  );
  if (shootPlace && shootDay) await linkShootPlaceToShootDay(siteUrl, token, shootDay.id, shootPlace);
  return {
    camera: await findOrCreateProjectEntity(siteUrl, token, LINKED_ENTITIES.camera, targetProject, cleanText(camera.camera)),
    lens: await findOrCreateProjectEntity(siteUrl, token, LINKED_ENTITIES.lens, targetProject, cleanText(camera.lens)),
    shootDay
  };
}

async function linkShootPlaceToShootDay(siteUrl, token, shootDayId, shootPlace) {
  await requestJson(`${siteUrl}/api/${FLOWPT_API_VERSION}/entity/${LINKED_ENTITIES.shootDay.endpoint}/${shootDayId}`, {
    token,
    method: 'PUT',
    body: {
      sg_shoot_place: {
        multi_entity_update_mode: 'add',
        value: [shootPlace]
      }
    }
  });
}

async function validateListFieldValue(siteUrl, token, { field, label, value }) {
  if (!value) return { field, label, value, included: true };
  const schemaUrl = `${siteUrl}/api/${FLOWPT_API_VERSION}/schema/custom_entity01/fields/${field}`;
  try {
    const schema = await requestJson(schemaUrl, { token });
    const values = schema?.data?.properties?.valid_values?.value || [];
    if (values.includes(value)) return { field, label, value, included: true };
    return { field, label, value, included: false, reason: `${label}「${value}」は${field}リストの候補にありません。sg_commentに記載して同期しました。` };
  } catch (error) {
    const reason = String(error.message || error);
    console.warn(`FlowPT ${field} value "${value}" could not be verified against the list. Continuing without this field.`, error);
    return { field, label, value, included: false, reason: `${label}「${value}」を${field}リストと照合できませんでした。sg_commentに記載して同期しました。詳細: ${reason}` };
  }
}

async function validateListFields(siteUrl, token, camera) {
  const results = await Promise.all(LIST_FIELDS.map(definition => validateListFieldValue(siteUrl, token, {
    field: definition.field,
    label: definition.label,
    value: definition.getValue(camera)
  })));
  return Object.fromEntries(results.map(result => [result.field, result]));
}

async function verifyTargetProject(siteUrl, token, targetProject) {
  const response = await requestJson(
    `${siteUrl}/api/${FLOWPT_API_VERSION}/entity/projects/${targetProject.id}?fields=name`,
    { token }
  );
  if (Number(response?.data?.id) !== targetProject.id) {
    throw new Error(`Configured API Script did not return the selected Project ${targetProject.name} (${targetProject.id}).`);
  }
}

async function findShootingData(siteUrl, token, syncKey) {
  const query = new URLSearchParams({
    [`filter[${UUID_FIELD}]`]: syncKey,
    'page[size]': '2',
    fields: `code,project,sg_comment,${UUID_FIELD}`
  });
  const response = await requestJson(
    `${siteUrl}/api/${FLOWPT_API_VERSION}/entity/${SHOOTING_DATA_ENDPOINT}?${query}`,
    { token }
  );
  const records = response?.data || [];
  if (records.length > 1) throw new Error(`More than one Shooting Data record uses ${UUID_FIELD}=${syncKey}.`);
  return records[0] || null;
}

async function updateExistingShootingData(siteUrl, token, recordId, fields, existingComment = '') {
  const url = `${siteUrl}/api/${FLOWPT_API_VERSION}/entity/${SHOOTING_DATA_ENDPOINT}/${recordId}?options[fields]=code,project,${UUID_FIELD}`;
  try {
    return { response: await requestJson(url, { token, method: 'PUT', body: fields }), warnings: [] };
  } catch (initialError) {
    console.warn(`FlowPT rejected one or more fields on existing Shooting Data ${recordId}; retrying fields individually.`, initialError);
  }

  const skipped = [];
  for (const [field, value] of Object.entries(fields)) {
    if (field === 'sg_comment') continue;
    try {
      await requestJson(url, { token, method: 'PUT', body: { [field]: value } });
    } catch (error) {
      skipped.push({ field, reason: String(error.message || error) });
    }
  }

  const commentParts = [cleanText(existingComment), cleanText(fields.sg_comment)];
  if (skipped.length) {
    commentParts.push(`VFX Sheet sync skipped non-editable FlowPT fields: ${skipped.map(({ field }) => field).join(', ')}.`);
  }
  const comment = commentParts.filter(Boolean).join('\n');
  if (comment) {
    try {
      await requestJson(url, { token, method: 'PUT', body: { sg_comment: comment } });
    } catch (error) {
      throw new Error(`FlowPT fields were skipped, but sg_comment could not be updated: ${error.message || error}`);
    }
  }

  return {
    response: null,
    warnings: skipped.map(({ field, reason }) => `既存のShooting Dataで編集できないフィールド「${field}」をスキップし、sg_commentに記載しました。詳細: ${reason}`)
  };
}

async function upsertCameraShootingData(siteUrl, token, targetProject, record, camera, cameraIndex) {
  const syncKey = makeCameraSyncKey(record, cameraIndex);
  const listFields = await validateListFields(siteUrl, token, camera);
  const links = await resolveShootingDataLinks(siteUrl, token, targetProject, record, camera);
  const fields = mapShootingData(record, camera, cameraIndex, links, listFields);
  const warnings = Object.values(listFields).filter(result => !result.included).map(result => result.reason);
  const existing = await findShootingData(siteUrl, token, syncKey);

  if (existing) {
    if (getProjectId(existing) !== targetProject.id) {
      throw new Error(`Shooting Data ${existing.id} with matching UUID is outside ${targetProject.name}.`);
    }
    const update = await updateExistingShootingData(siteUrl, token, existing.id, fields, existing?.attributes?.sg_comment);
    const id = update.response?.data?.id ?? existing.id;
    await uploadShootingDataMedia(siteUrl, token, id, record, camera);
    return { id, syncKey, action: 'updated', warnings: [...warnings, ...update.warnings] };
  }

  const created = await requestJson(
    `${siteUrl}/api/${FLOWPT_API_VERSION}/entity/${SHOOTING_DATA_ENDPOINT}?options[fields]=code,project,${UUID_FIELD}`,
    {
      token,
      method: 'POST',
      body: { ...fields, project: { type: 'Project', id: targetProject.id } }
    }
  );
  const createdRecord = created?.data;
  if (!createdRecord?.id || getProjectId(createdRecord) !== targetProject.id) {
    throw new Error(`Flow Production Tracking did not confirm that the created Shooting Data belongs to ${targetProject.name}.`);
  }
  await uploadShootingDataMedia(siteUrl, token, createdRecord.id, record, camera);
  return { id: createdRecord.id, syncKey, action: 'created', warnings };
}

function absoluteUrl(siteUrl, value) {
  return new URL(value, siteUrl).href;
}

async function uploadFileToField(siteUrl, token, recordId, field, blob, filename) {
  const uploadInfo = await requestJson(
    `${siteUrl}/api/${FLOWPT_API_VERSION}/entity/${SHOOTING_DATA_ENDPOINT}/${recordId}/${field}/_upload?${new URLSearchParams({ filename })}`,
    { token }
  );
  const uploadResponse = await fetch(absoluteUrl(siteUrl, uploadInfo?.links?.upload), {
    method: 'PUT',
    headers: { 'Content-Type': blob.type || 'application/octet-stream' },
    body: blob
  });
  if (!uploadResponse.ok) throw new Error(`Flow Production Tracking ${field} upload failed (HTTP ${uploadResponse.status}).`);
  let uploadBody = {};
  try {
    uploadBody = await uploadResponse.json();
  } catch {
    // Presigned S3 uploads have no JSON response body.
  }
  const completeUrl = absoluteUrl(siteUrl, uploadBody?.links?.complete_upload || uploadInfo?.links?.complete_upload);
  const complete = await fetch(completeUrl, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      upload_info: { ...uploadInfo.data, ...uploadBody?.data },
      upload_data: {}
    })
  });
  if (!complete.ok) {
    let body = null;
    try { body = await complete.json(); } catch { /* The status below remains useful. */ }
    throw new Error(flowPtError(body, complete.status));
  }
}

async function uploadShootingDataMedia(siteUrl, token, recordId, record, camera) {
  const thumbnails = getRecordShotThumbnails(record);
  if (thumbnails.length) {
    const collage = await createThumbnailCollage(thumbnails);
    if (collage) {
      await uploadFileToField(siteUrl, token, recordId, 'image', collage, getShootingDataExportFilename(record, camera, 'jpg'));
    }
  }
  const pdf = new Blob([await createShootingDataPdf(record, camera)], { type: 'application/pdf' });
  await uploadFileToField(siteUrl, token, recordId, 'sg_vfx_sheet', pdf, getShootingDataExportFilename(record, camera, 'pdf'));
}

export async function syncData() {
  if (!navigator.onLine) return alert('You are currently offline.');

  const connection = await getFlowPtConnection();
  if (!connection.enabled) {
    return alert('Enable Flow Production Tracking REST API in Settings and test the connection before syncing.');
  }
  if (!connection.siteUrl || !connection.scriptName || !connection.scriptKey) {
    return alert('Save the Flow Production Tracking REST API connection in Settings before syncing.');
  }
  if (!Number.isInteger(Number(connection.targetProject?.id))) {
    return alert('Test the Flow Production Tracking connection and select a sync target Project in Settings before syncing.');
  }
  const targetProject = { id: Number(connection.targetProject.id), name: connection.targetProject.name || `Project ${connection.targetProject.id}` };

  const targetRecords = await getRecordsForHistoryAction();
  const unsynced = targetRecords.filter(record => !record.synced);
  if (unsynced.length === 0) return alert('No unsynced records in the current selection or filtered list.');

  const syncBtn = document.getElementById('syncBtn');
  syncBtn.disabled = true;
  syncBtn.innerText = 'Syncing…';
  let successCount = 0;
  const failures = [];
  const warnings = [];

  try {
    const token = await testFlowPtConnection();
    await verifyTargetProject(connection.siteUrl, token.access_token, targetProject);

    for (const record of unsynced) {
      try {
        const cameras = record.cameras?.length ? record.cameras : [{}];
        const results = [];
        await db.sheets.update(record.id, { syncState: 'syncing', syncProgress: 8, syncError: '' });
        await renderList();
        for (let cameraIndex = 0; cameraIndex < cameras.length; cameraIndex++) {
          const result = await upsertCameraShootingData(connection.siteUrl, token.access_token, targetProject, record, cameras[cameraIndex], cameraIndex);
          results.push(result);
          result.warnings.forEach(warning => warnings.push(`#${record.id}: ${warning}`));
          await db.sheets.update(record.id, { syncProgress: Math.round(((cameraIndex + 1) / cameras.length) * 90) });
          await renderList();
        }
        await db.sheets.update(record.id, {
          synced: 1,
          synced_at: new Date().toISOString(),
          syncError: '',
          syncState: '',
          syncProgress: 100,
          flowptSync: { projectId: targetProject.id, shootingData: results }
        });
        successCount++;
        await renderList();
      } catch (error) {
        console.error('Flow Production Tracking sync error:', error);
        const message = String(error.message || error);
        failures.push({ id: record.id, message });
        await db.sheets.update(record.id, { syncError: message, syncState: '', syncProgress: 0 });
        await renderList();
      }
    }
    const summary = `${successCount} record(s) synced to Shooting Data in ${targetProject.name}.`;
    const details = [
      failures.length ? `${failures.length} record(s) failed:\n${failures.map(({ id, message }) => `#${id}: ${message}`).join('\n')}` : '',
      warnings.length ? `${warnings.length}件のリスト項目をFlowPTに設定できませんでした。sg_commentに記載して同期しています。\n${warnings.join('\n')}` : ''
    ].filter(Boolean);
    alert(details.length ? `${summary}\n\n${details.join('\n\n')}` : summary);
  } catch (error) {
    console.error('Flow Production Tracking sync setup error:', error);
    const message = String(error.message || error);
    for (const record of unsynced) await db.sheets.update(record.id, { syncError: message, syncState: '', syncProgress: 0 });
    alert(`Flow Production Tracking Sync Error:\n${message}`);
  } finally {
    syncBtn.disabled = false;
    syncBtn.innerText = 'Sync to FlowPT';
    renderList();
  }
}

