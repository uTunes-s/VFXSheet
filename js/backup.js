// Portable VFX Sheet backup import/export with embedded Blob assets.
import { db } from './database.js';
import { newUuid } from './utils.js';
import { downloadExportBlob } from './media-utils.js';
import { getRecordsForHistoryAction } from './record-selection.js';
import { renderList } from './record-list-renderer.js';

export async function exportBackupJSON() {
  const records = await getRecordsForHistoryAction();
  if (!records.length) return alert('No records to back up.');
  const portableRecords = await Promise.all(records.map(async ({ images, shot_thumbnail, shot_thumbnails, ...record }) => ({
    ...record,
    asset_status: images?.length || shot_thumbnail || shot_thumbnails?.length ? 'included' : 'none',
    assets: {
      images: await Promise.all((images || []).map(blobToBase64)),
      shot_thumbnail: shot_thumbnail ? await blobToBase64(shot_thumbnail) : null,
      shot_thumbnails: await Promise.all((shot_thumbnails || []).map(blobToBase64))
    }
  })));
  const backup = { app: 'VFX_Sheet', format: 'vfx-sheet-record-backup', version: 2, exported_at: new Date().toISOString(), records: portableRecords };
  downloadExportBlob(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }), `VFX_Sheet_Backup_${new Date().toISOString().slice(0, 10)}.json`);
  alert(`${records.length} records backed up. This is a full backup that includes photos, thumbnails, and Fabric sketch data.`);
}

export async function importBackupJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const data = JSON.parse(await file.text());
    if (data.app !== 'VFX_Sheet' || data.format !== 'vfx-sheet-record-backup' || !Array.isArray(data.records)) {
      throw new Error('This is not a VFX Sheet Backup JSON file.');
    }
    if (!data.records.every(record => record && typeof record === 'object')) {
      throw new Error('The record format in the backup is invalid.');
    }
    const includesAssets = data.records.some(record => record.assets && typeof record.assets === 'object');
    if (!confirm(`Import ${data.records.length} record(s).\nRecords with matching UUIDs will be updated from the backup.\n${includesAssets ? 'Photos and thumbnails will also be restored to IndexedDB.' : 'This legacy-format backup will retain existing photos and thumbnails.'}\n\nContinue?`)) return;

    const restoredRecords = await Promise.all(data.records.map(async backupRecord => ({
      record: backupRecord,
      assets: backupRecord.assets ? await restoreBackupAssets(backupRecord.assets) : null
    })));

    let created = 0;
    let updated = 0;
    await db.transaction('rw', db.sheets, async () => {
      for (const { record: backupRecord, assets } of restoredRecords) {
        const uuid = backupRecord.uuid || newUuid();
        const existing = await db.sheets.where('uuid').equals(uuid).first();
        const { id: backupId, images, shot_thumbnail, shot_thumbnails, assets: ignoredAssets, ...portableRecord } = backupRecord;
        const restoredAssetFields = assets || {
          images: existing?.images,
          shot_thumbnail: existing?.shot_thumbnail,
          shot_thumbnails: existing?.shot_thumbnails
        };
        if (existing) {
          await db.sheets.put({ ...portableRecord, id: existing.id, uuid, ...restoredAssetFields });
          updated++;
        } else {
          await db.sheets.add({ ...portableRecord, uuid, ...restoredAssetFields });
          created++;
        }
      }
    });

    await renderList();
    alert(`Backup imported.\nNew: ${created} / Updated: ${updated}${includesAssets ? '\nPhotos and thumbnails were restored to IndexedDB.' : '\nPhotos and thumbnails were not restored because this is a legacy-format backup.'}`);
  } catch (error) {
    alert(`Backup Import Error: ${error.message}`);
  } finally {
    event.target.value = '';
  }
}

export async function restoreBackupAssets(assets) {
  if (!Array.isArray(assets.images) || !Array.isArray(assets.shot_thumbnails)) {
    throw new Error('The image data format in the backup is invalid.');
  }
  return {
    images: await Promise.all(assets.images.map(dataUrlToBlob)),
    shot_thumbnail: assets.shot_thumbnail ? await dataUrlToBlob(assets.shot_thumbnail) : undefined,
    shot_thumbnails: await Promise.all(assets.shot_thumbnails.map(dataUrlToBlob))
  };
}

export async function dataUrlToBlob(dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    throw new Error('The image data in the backup is invalid.');
  }
  const response = await fetch(dataUrl);
  if (!response.ok) throw new Error('Could not restore the image data.');
  return response.blob();
}

export function blobToBase64(blob) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

Object.assign(globalThis, { exportBackupJSON, importBackupJSON, restoreBackupAssets, dataUrlToBlob, blobToBase64 });
