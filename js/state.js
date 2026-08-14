// Shared application state. The global property bridge keeps remaining classic
// feature scripts working while feature groups migrate to direct imports.
export const state = {
  currentEditingId: null,
  isEditingInModal: false,
  selectedRecordIds: new Set(),
  japanesePdfFontPromise: null,
  recordDraftBeforeHistoryEdit: null,
  isConfiguringAddDefaults: false,
  initialSettingToggleStates: {},
  cameraListState: [],
  activeCamIndex: 0,
  fCanvas: null,
  canvasHistory: [],
  historyIndex: -1,
  isUndoRedo: false,
  canvasMode: 'draw',
  drawBrushWidth: 3,
  eraserBrushWidth: 24,
  currentDrawingColor: '#00ffff',
  pendingShotThumbnails: []
};

export const initialSettingItems = [
  ['operator', 'Operator'], ['show_title', 'Show Title'], ['location', 'Location'],
  ['shoot_datetime', 'Date & Time'], ['episode', 'Episode'], ['scene', 'Scene'], ['shot', 'Shot'], ['gps_location', 'GPS Location'],
  ['hdri', 'HDRI Setup'], ['notes', 'Notes'], ['shot_thumbnails', 'Shot Data Thumbnail'], ['sketch', 'Sketch'],
  ['camera_preset', 'Camera Model'], ['lens_preset', 'Lens Model'], ['focal_length', 'Focal Length'], ['t_stop', 'Aperture'], ['clip_name', 'Clip Name'], ['lut_info', 'LUT Info'], ['cramerawork_preset', 'Movement'], ['height_value', 'Lens Height'], ['distance_value', 'Target Distance'], ['tilt_value', 'Tilt Angle'], ['reference_flags', 'Reference Checklist']
];

Object.keys(state).forEach(key => Object.defineProperty(globalThis, key, {
  configurable: true,
  get: () => state[key],
  set: value => { state[key] = value; }
}));
globalThis.initialSettingItems = initialSettingItems;
