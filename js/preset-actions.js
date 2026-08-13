// Mutations for the preset catalog modal.
function normalizedPresetList(type, list) {
  if (type === 'camera') return normalizeCameraPresets(list);
  if (type === 'lens') return normalizeLensPresets(list);
  return normalizeMovementPresets(list);
}

async function addPresetItem(type) {
  const configs = {
    camera: { input: 'newCameraInput', field: 'name', duplicate: 'This camera model is already registered.', item: value => ({ name: value, category: 'Custom', enabled: true }) },
    lens: { input: 'newLensNameInput', field: 'name', duplicate: 'This lens model is already registered.', item: value => ({ name: value, focal: document.getElementById('newLensFocalInput').value.trim(), category: 'Custom', enabled: true }) },
    movement: { input: 'newMovementInput', field: 'name', duplicate: 'This movement is already registered.', item: value => ({ name: value, enabled: true }) }
  };
  const config = configs[type];
  const input = document.getElementById(config.input);
  const value = input.value.trim();
  if (!value) return;
  const record = await db.presets.get(type);
  record.list = normalizedPresetList(type, record.list);
  if (record.list.some(item => item[config.field] === value)) return alert(config.duplicate);
  record.list.push(config.item(value));
  await db.presets.put(record);
  input.value = '';
  if (type === 'lens') document.getElementById('newLensFocalInput').value = '';
  await initPresets();
  renderPresetModalLists();
}

async function togglePresetItem(type, index, enabled) {
  const record = await db.presets.get(type);
  record.list = normalizedPresetList(type, record.list);
  if (!record.list[index]) return;
  record.list[index].enabled = enabled;
  await db.presets.put(record);
  await initPresets();
  renderPresetModalLists();
}

function setLensSeriesOpen(series, isOpen) {
  if (isOpen) openLensSeries.add(series);
  else openLensSeries.delete(series);
}

async function toggleLensSeries(series, enabled) {
  const record = await db.presets.get('lens');
  record.list = normalizeLensPresets(record.list).map(lens => getLensSeries(lens) === series ? { ...lens, enabled } : lens);
  await db.presets.put(record);
  await initPresets();
  renderPresetModalLists();
}

async function removePresetItem(type, index) {
  const record = await db.presets.get(type);
  record.list = normalizedPresetList(type, record.list);
  record.list.splice(index, 1);
  await db.presets.put(record);
  await initPresets();
  renderPresetModalLists();
}

async function resetPresetsToDefault() {
  if (!confirm('Reset all presets to default?')) return;
  await db.presets.put({ type: 'camera', list: defaultCameras });
  await db.presets.put({ type: 'lens', list: defaultLenses });
  await db.presets.put({ type: 'movement', list: defaultMovements });
  await db.presets.delete('user_defaults');
  await initPresets();
  renderPresetModalLists();
}
