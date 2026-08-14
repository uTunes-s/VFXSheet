// Sends unsynced metadata to the configured FlowPT endpoint.
import { db } from './database.js';
import { renderList } from './record-list-renderer.js';

export async function syncData() {
  if (!navigator.onLine) return alert('You are currently offline.');

  const workerUrl = '/api/sync';
  const unsynced = await db.sheets.where('synced').equals(0).toArray();
  if (unsynced.length === 0) return alert('No unsynced records.');

  const syncBtn = document.getElementById('syncBtn');
  syncBtn.disabled = true;
  syncBtn.innerText = 'Syncing...';

  let successCount = 0;
  for (const item of unsynced) {
    try {
      // Image blobs and Fabric JSON can exceed mobile request limits. Keep them in
      // IndexedDB and JSON backup; FlowPT receives the structured shot metadata.
      const payload = { ...item, asset_status: item.images?.length ? 'local_only' : 'none' };
      delete payload.images;
      delete payload.canvas_json;

      const response = await fetch(workerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        await db.sheets.update(item.id, { synced: 1, synced_at: new Date().toISOString(), syncError: '' });
        successCount++;
      } else {
        await db.sheets.update(item.id, { syncError: `HTTP ${response.status}` });
      }
    } catch (error) {
      console.error('Sync Error:', error);
      await db.sheets.update(item.id, { syncError: String(error.message || error) });
    }
  }

  alert(`${successCount} records synced to FlowPT.`);
  syncBtn.disabled = false;
  syncBtn.innerText = 'Sync to FlowPT';
  renderList();
}

