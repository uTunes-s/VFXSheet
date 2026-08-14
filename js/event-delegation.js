// Centralized event routing for static and dynamically rendered controls.
import { state } from './state.js';
import { preventFormEnterSubmit } from './utils.js';
import { openAddDefaultsEditor, saveCurrentAsDefaultSettings } from './initial-settings-editor.js';
import { saveRecord } from './record-save.js';
import { getGPSLocation } from './gps.js';
import { openPresetModal, closePresetModal } from './preset-modal.js';
import { addCameraTab, editCameraReelName, removeCameraTab, switchCameraTab } from './camera-tabs-state.js';
import { toggleHdriWeather, switchAppPage } from './form-ui.js';
import { addShotThumbnails, clearShotThumbnail, moveShotThumbnail, renderShotThumbnailPreviews } from './shot-thumbnails.js';
import { setCanvasMode } from './canvas-mode.js';
import { setCanvasBrushSize, setCanvasColor } from './canvas-style.js';
import { undoCanvas, redoCanvas } from './canvas-history.js';
import { moveSelectedLayer, addTextToNote, deleteSelected, clearNoteCanvas } from './canvas-actions.js';
import { addFreeImageToCanvas } from './canvas-images.js';
import { openNewRecordModal, closeEditRecordModal } from './record-modal.js';
import { toggleSelectAllRecords, deleteSelectedRecords, toggleRecordSelection, deleteRecord } from './record-selection.js';
import { exportToCSV } from './flowpt-export.js';
import { exportToPDF } from './pdf-print-export.js';
import { exportBackupJSON, importBackupJSON } from './backup.js';
import { syncData } from './sync.js';
import { loadFlowPtProjects, markFlowPtConnectionTestSucceeded, saveFlowPtConnectionFromForm, saveSelectedFlowPtProject, setFlowPtEnabled } from './flowpt-settings.js';
import { exportSheetInitialSettings, selectSheetInitialSettingsImport } from './initial-settings-transfer.js';
import { closeRecordPreview, closeMediaLightbox, openMediaLightbox } from './media-modals.js';
import { exportFullPresetsJSON, importFullPresetsJSON } from './preset-transfer.js';
import { addPresetItem, resetPresetsToDefault, togglePresetItem, removePresetItem, toggleLensSeries, setLensSeriesOpen } from './preset-actions.js';
import { openRecordPreview } from './record-preview.js';
import { loadRecordForEdit } from './record-load.js';
import { changeRecordThumbnail } from './record-thumbnails.js';
import { onTabPresetChange, onTabLensChange } from './camera-tabs-interactions.js';
import { setTheme, toggleTheme } from './theme.js';
import { clearRecordListFilters, toggleRecordListFilterOption, updateRecordListFilter, updateRecordListSort } from './record-list-filters.js';
import { renderList } from './record-list-renderer.js';
  const number = value => Number.parseInt(value, 10);
  const toggleRecordListPopover = name => {
    const filterPopover = document.getElementById('recordFilterPopover');
    const sortPopover = document.getElementById('recordSortPopover');
    const filterButton = document.getElementById('recordFilterBtn');
    const sortButton = document.getElementById('recordSortBtn');
    const isFilter = name === 'filter';
    const target = isFilter ? filterPopover : sortPopover;
    const targetButton = isFilter ? filterButton : sortButton;
    const other = isFilter ? sortPopover : filterPopover;
    const otherButton = isFilter ? sortButton : filterButton;
    const willOpen = target.classList.contains('hidden');
    target.classList.toggle('hidden', !willOpen);
    targetButton.setAttribute('aria-expanded', String(willOpen));
    other.classList.add('hidden');
    otherButton.setAttribute('aria-expanded', 'false');
  };
  const actions = {
    'toggle-theme': () => toggleTheme(),
    'set-theme': element => setTheme(element.dataset.theme),
    'toggle-record-filter-popover': () => toggleRecordListPopover('filter'),
    'toggle-record-sort-popover': () => toggleRecordListPopover('sort'),
    'toggle-record-filter-option': element => { toggleRecordListFilterOption(element.dataset.filter, element.value, element.checked); renderList(); },
    'set-record-filter': element => { updateRecordListFilter(element.dataset.filter, element.multiple ? [...element.selectedOptions].map(option => option.value) : element.value); renderList(); },
    'set-record-sort': element => { updateRecordListSort(element.value); renderList(); },
    'clear-record-filters': () => { clearRecordListFilters(); renderList(); },
    'open-defaults-editor': () => openAddDefaultsEditor(),
    'save-record': (element, event) => saveRecord(event, element.dataset.mode || (state.currentEditingId ? 'update' : 'new')),
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
    'toggle-flowpt-enabled': async element => {
      try {
        await setFlowPtEnabled(element.checked);
      } catch (error) {
        alert(`Flow Production Tracking Settings Error: ${error.message || error}`);
      }
    },
    'select-flowpt-project': async () => {
      try {
        await saveSelectedFlowPtProject();
      } catch (error) {
        alert(`Flow Production Tracking Project Error: ${error.message || error}`);
      }
    },
    'save-flowpt-connection': async () => {
      try {
        await saveFlowPtConnectionFromForm();
        alert('Flow Production Tracking connection settings saved on this device.');
      } catch (error) {
        alert(`Flow Production Tracking Settings Error: ${error.message || error}`);
      }
    },
    'test-flowpt-connection': async element => {
      const originalLabel = element.textContent;
      element.disabled = true;
      element.textContent = 'Testing…';
      try {
        const { token, projects } = await loadFlowPtProjects();
        markFlowPtConnectionTestSucceeded();
        alert(`Flow Production Tracking connection succeeded. ${projects.length} accessible Project(s) loaded. Select the sync target Project below; it is saved automatically. Access token expires in ${token.expires_in || 'an unknown number of'} seconds.`);
      } catch (error) {
        console.error('Flow Production Tracking connection test failed:', error);
        alert(`Flow Production Tracking Connection Error: ${error.message || error}`);
      } finally {
        element.disabled = false;
        element.textContent = originalLabel;
      }
    },
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
    'switch-camera': element => switchCameraTab(number(element.dataset.cameraIndex)),
    'tab-preset-change': element => onTabPresetChange(element.dataset.presetType),
    'tab-lens-change': () => onTabLensChange(),
    'toggle-preset-item': element => togglePresetItem(element.dataset.presetType, number(element.dataset.presetIndex), element.checked),
    'remove-preset-item': element => removePresetItem(element.dataset.presetType, number(element.dataset.presetIndex)),
    'toggle-lens-series': element => toggleLensSeries(element.dataset.lensSeries, element.checked),
    'set-lens-series-open': element => setLensSeriesOpen(element.dataset.lensSeries, element.open),
    'open-media-lightbox': element => openMediaLightbox(element.currentSrc || element.src, element.alt),
    'remove-shot-thumbnail': element => {
      state.pendingShotThumbnails.splice(number(element.dataset.thumbnailIndex), 1);
      renderShotThumbnailPreviews();
    },
    'move-shot-thumbnail': element => moveShotThumbnail(number(element.dataset.thumbnailIndex), number(element.dataset.direction)),
    'toggle-initial-setting': (element, event) => {
      event.preventDefault();
      const input = element.querySelector('input');
      input.checked = !input.checked;
      state.initialSettingToggleStates[element.dataset.initialSetting] = input.checked;
    }
  };

  function route(event) {
    if (event.type === 'keydown') {
      if (event.target.closest?.('#vfxForm')) preventFormEnterSubmit(event);
      return;
    }
    const element = event.target.closest?.('[data-action]');
    if (!element) return;
    const action = actions[element.dataset.action];
    if (!action) return;
    const changeActions = new Set(['toggle-hdri', 'add-shot-thumbnails', 'add-canvas-image', 'import-backup', 'import-presets', 'tab-preset-change', 'tab-lens-change', 'toggle-preset-item', 'toggle-lens-series', 'toggle-record-filter-option', 'set-record-filter', 'set-record-sort', 'select-flowpt-project', 'toggle-flowpt-enabled']);
    const inputActions = new Set(['set-brush-size']);
    const toggleActions = new Set(['set-lens-series-open']);
    if (event.type === 'submit' && element.dataset.action !== 'save-record') return;
    if (event.type === 'change' && !changeActions.has(element.dataset.action) && element.dataset.action !== 'set-canvas-color') return;
    if (event.type === 'input' && !inputActions.has(element.dataset.action)) return;
    if (event.type === 'toggle' && !toggleActions.has(element.dataset.action)) return;
    if (event.type === 'click' && (changeActions.has(element.dataset.action) || inputActions.has(element.dataset.action) || toggleActions.has(element.dataset.action) || element.dataset.action === 'save-record' || (element.dataset.action === 'set-canvas-color' && element.matches('input')))) return;
    if (event.type === 'click' && element.disabled) return;
    action(element, event);
  }

export function initEventDelegation() {
  if (document.documentElement.dataset.eventDelegationReady) return;
  document.documentElement.dataset.eventDelegationReady = 'true';
  ['click', 'change', 'input', 'submit', 'keydown', 'toggle'].forEach(type => document.addEventListener(type, route));
}
// Module API ends here.

