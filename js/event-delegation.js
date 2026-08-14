// Centralized event routing for static and dynamically rendered controls.
(function () {
  const number = value => Number.parseInt(value, 10);
  const actions = {
    'open-defaults-editor': () => openAddDefaultsEditor(),
    'save-record': (element, event) => saveRecord(event, element.dataset.mode || (currentEditingId ? 'update' : 'new')),
    'prevent-enter-submit': (_, event) => preventFormEnterSubmit(event),
    'get-gps': () => getGPSLocation(),
    'open-preset-modal': () => openPresetModal(),
    'close-preset-modal': () => closePresetModal(),
    'add-camera': () => addCameraTab(),
    'toggle-hdri': element => toggleHdriWeather(element.checked),
    'open-file-input': element => document.getElementById(element.dataset.inputId)?.click(),
    'add-shot-thumbnails': (_, event) => addShotThumbnails(event),
    'clear-shot-thumbnails': () => clearShotThumbnail(),
    'set-canvas-mode': element => setCanvasMode(element.dataset.mode),
    'set-brush-size': element => setCanvasBrushSize(element.dataset.brush, element.value),
    'undo-canvas': () => undoCanvas(),
    'redo-canvas': () => redoCanvas(),
    'move-canvas-layer': element => moveSelectedLayer(element.dataset.direction),
    'set-canvas-color': element => setCanvasColor(element.dataset.color || element.value),
    'add-canvas-image': (_, event) => addFreeImageToCanvas(event),
    'add-canvas-text': () => addTextToNote(),
    'delete-canvas-selection': () => deleteSelected(),
    'clear-canvas': () => clearNoteCanvas(),
    'open-new-record': () => openNewRecordModal(),
    'toggle-select-all-records': () => toggleSelectAllRecords(),
    'delete-selected-records': () => deleteSelectedRecords(),
    'export-csv': () => exportToCSV(),
    'export-pdf': () => exportToPDF(),
    'export-backup': () => exportBackupJSON(),
    'import-backup': (_, event) => importBackupJSON(event),
    'sync-data': () => syncData(),
    'switch-page': element => switchAppPage(element.dataset.page),
    'export-sheet-defaults': () => exportSheetInitialSettings(),
    'import-sheet-defaults': () => selectSheetInitialSettingsImport(),
    'save-sheet-defaults': () => saveCurrentAsDefaultSettings(),
    'save-new-record': (_, event) => saveRecord(event, 'new'),
    'save-existing-record': (_, event) => saveRecord(event, 'update'),
    'close-edit-modal': () => closeEditRecordModal(),
    'close-preview-modal': () => closeRecordPreview(),
    'close-media-lightbox': () => closeMediaLightbox(),
    'export-presets': () => exportFullPresetsJSON(),
    'import-presets': (_, event) => importFullPresetsJSON(event),
    'add-preset': element => addPresetItem(element.dataset.presetType),
    'reset-presets': () => resetPresetsToDefault(),
    'open-record-preview': element => openRecordPreview(number(element.dataset.recordId)),
    'toggle-record-selection': element => toggleRecordSelection(number(element.dataset.recordId), element.checked),
    'load-record': element => loadRecordForEdit(number(element.dataset.recordId), element.dataset.duplicate === 'true'),
    'delete-record': element => deleteRecord(number(element.dataset.recordId)),
    'change-record-thumbnail': element => changeRecordThumbnail(element, number(element.dataset.direction)),
    'edit-camera-reel-name': (element, event) => editCameraReelName(number(element.dataset.cameraIndex), event),
    'remove-camera': (element, event) => removeCameraTab(number(element.dataset.cameraIndex), event),
    'tab-preset-change': element => onTabPresetChange(element.dataset.presetType),
    'tab-lens-change': () => onTabLensChange(),
    'toggle-preset-item': element => togglePresetItem(element.dataset.presetType, number(element.dataset.presetIndex), element.checked),
    'remove-preset-item': element => removePresetItem(element.dataset.presetType, number(element.dataset.presetIndex)),
    'toggle-lens-series': element => toggleLensSeries(element.dataset.lensSeries, element.checked),
    'set-lens-series-open': element => setLensSeriesOpen(element.dataset.lensSeries, element.open),
    'open-media-lightbox': element => openMediaLightbox(element.currentSrc || element.src, element.alt),
    'remove-shot-thumbnail': element => {
      pendingShotThumbnails.splice(number(element.dataset.thumbnailIndex), 1);
      renderShotThumbnailPreviews();
    },
    'move-shot-thumbnail': element => moveShotThumbnail(number(element.dataset.thumbnailIndex), number(element.dataset.direction))
  };

  function migrateInlineAction(element, attribute, expression) {
    const set = (action, values = {}) => {
      element.dataset.action = action;
      Object.entries(values).forEach(([key, value]) => { element.dataset[key] = value; });
      element.removeAttribute(attribute);
    };
    let match;
    if (attribute === 'onchange') {
      if ((match = expression.match(/^toggleRecordSelection\((\d+), this\.checked\)$/))) return set('toggle-record-selection', { recordId: match[1] });
      if ((match = expression.match(/^onTabPresetChange\('([^']+)'\)$/))) return set('tab-preset-change', { presetType: match[1] });
      if (expression === 'onTabLensChange()') return set('tab-lens-change');
      if ((match = expression.match(/^togglePresetItem\('([^']+)', (\d+), this\.checked\)$/))) return set('toggle-preset-item', { presetType: match[1], presetIndex: match[2] });
      if ((match = expression.match(/^toggleLensSeries\('([^']+)', this\.checked\)$/))) return set('toggle-lens-series', { lensSeries: match[1] });
    }
    if (attribute === 'ontoggle' && (match = expression.match(/^setLensSeriesOpen\('([^']+)', this\.open\)$/))) return set('set-lens-series-open', { lensSeries: match[1] });
    if (attribute === 'onclick') {
      if (expression === 'event.stopPropagation()') {
        element.removeAttribute(attribute);
        return;
      }
      if ((match = expression.match(/^openRecordPreview\((\d+)\)$/))) return set('open-record-preview', { recordId: match[1] });
      if ((match = expression.match(/^event\.stopPropagation\(\); loadRecordForEdit\((\d+)(?:, (true))?\)$/))) return set('load-record', { recordId: match[1], duplicate: String(Boolean(match[2])) });
      if ((match = expression.match(/^event\.stopPropagation\(\); deleteRecord\((\d+)\)$/))) return set('delete-record', { recordId: match[1] });
      if ((match = expression.match(/^event\.stopPropagation\(\); changeRecordThumbnail\(this, (-?\d+)\)$/))) return set('change-record-thumbnail', { direction: match[1] });
      if ((match = expression.match(/^editCameraReelName\((\d+), event\)$/))) return set('edit-camera-reel-name', { cameraIndex: match[1] });
      if ((match = expression.match(/^removeCameraTab\((\d+), event\)$/))) return set('remove-camera', { cameraIndex: match[1] });
      if ((match = expression.match(/^removePresetItem\('([^']+)', (\d+)\)$/))) return set('remove-preset-item', { presetType: match[1], presetIndex: match[2] });
      if (expression === 'openMediaLightbox(this.src, this.alt)') return set('open-media-lightbox');
    }
  }

  function migrateInlineActions(root) {
    if (!(root instanceof Element)) return;
    const elements = [root, ...root.querySelectorAll('*')];
    elements.forEach(element => ['onclick', 'onchange', 'oninput', 'onsubmit', 'onkeydown', 'ontoggle'].forEach(attribute => {
      if (element.hasAttribute(attribute)) migrateInlineAction(element, attribute, element.getAttribute(attribute));
    }));
  }

  function route(event) {
    if (event.type === 'keydown') {
      if (event.target.closest?.('#vfxForm')) preventFormEnterSubmit(event);
      return;
    }
    const element = event.target.closest?.('[data-action]');
    if (!element) return;
    const action = actions[element.dataset.action];
    if (!action) return;
    const changeActions = new Set(['toggle-hdri', 'add-shot-thumbnails', 'set-canvas-color', 'add-canvas-image', 'import-backup', 'import-presets', 'tab-preset-change', 'tab-lens-change', 'toggle-preset-item', 'toggle-lens-series']);
    const inputActions = new Set(['set-brush-size']);
    const toggleActions = new Set(['set-lens-series-open']);
    if (event.type === 'submit' && element.dataset.action !== 'save-record') return;
    if (event.type === 'change' && !changeActions.has(element.dataset.action)) return;
    if (event.type === 'input' && !inputActions.has(element.dataset.action)) return;
    if (event.type === 'toggle' && !toggleActions.has(element.dataset.action)) return;
    if (event.type === 'click' && (changeActions.has(element.dataset.action) || inputActions.has(element.dataset.action) || toggleActions.has(element.dataset.action) || element.dataset.action === 'save-record')) return;
    if (event.type === 'click' && element.disabled) return;
    action(element, event);
  }

  function initEventDelegation() {
    if (document.documentElement.dataset.eventDelegationReady) return;
    document.documentElement.dataset.eventDelegationReady = 'true';
    ['click', 'change', 'input', 'submit', 'keydown', 'toggle'].forEach(type => document.addEventListener(type, route));
    migrateInlineActions(document.body);
    new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(migrateInlineActions))).observe(document.body, { childList: true, subtree: true });
  }

  window.initEventDelegation = initEventDelegation;
})();
