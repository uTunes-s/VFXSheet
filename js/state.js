// Shared feature state. This classic-script boundary keeps the existing feature
// bundle working while the remaining handlers are migrated to ES modules.
let currentEditingId = null;
let isEditingInModal = false;
const selectedRecordIds = new Set();
let japanesePdfFontPromise = null;
let recordDraftBeforeHistoryEdit = null;
let isConfiguringAddDefaults = false;
let initialSettingToggleStates = {};
let cameraListState = [];
let activeCamIndex = 0;
let currentDrawingColor = '#00ffff';
let pendingShotThumbnails = [];

const initialSettingItems = [
  ['operator', 'Operator'], ['show_title', 'Show Title'], ['location', 'Location'],
  ['shoot_datetime', 'Date & Time'], ['episode', 'Episode'], ['scene', 'Scene'], ['shot', 'Shot'], ['gps_location', 'GPS Location'],
  ['hdri', 'HDRI Setup'], ['notes', 'Notes'], ['shot_thumbnails', 'Shot Data Thumbnail'], ['sketch', 'Sketch'],
  ['camera_preset', 'Camera Model'], ['lens_preset', 'Lens Model'], ['focal_length', 'Focal Length'], ['t_stop', 'Aperture'], ['clip_name', 'Clip Name'], ['lut_info', 'LUT Info'], ['cramerawork_preset', 'Movement'], ['height_value', 'Lens Height'], ['distance_value', 'Target Distance'], ['tilt_value', 'Tilt Angle'], ['reference_flags', 'Reference Checklist']
];
