// IndexedDB schema and migrations. The data model is loaded before feature code.
import { newUuid } from './utils.js';

export const db = new Dexie('VfxSheetDB');

db.version(11).stores({
  sheets: '++id, uuid, operator, show_title, scene, shot, synced, created_at',
  presets: 'type'
}).upgrade(async tx => {
  await tx.table('sheets').toCollection().modify(record => {
    if (!record.uuid) record.uuid = newUuid();
    if (record.syncError === undefined) record.syncError = '';
    if (!record.canvas_version && record.canvas_json) record.canvas_version = 5;
  });
});
