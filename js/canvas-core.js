// Fabric canvas initialization and image crop-control registration.
import { state } from './state.js';
import { saveCanvasState } from './canvas-history.js';
import { markInitialSettingEnabled } from './initial-settings-ui.js';
import { eraseIntersectedSketchLayers } from './canvas-eraser.js';
import { enterCanvasImageCropMode } from './canvas-crop.js';

export function initFabricCanvas() {
  state.fCanvas = new fabric.Canvas('noteCanvas', {
    isDrawingMode: true,
    backgroundColor: '#090d16',
    preserveObjectStacking: true
  });
  state.fCanvas.freeDrawingBrush.color = state.currentDrawingColor;
  state.fCanvas.freeDrawingBrush.width = state.drawBrushWidth;
  state.fCanvas.upperCanvasEl.style.touchAction = 'pan-y pinch-zoom';

  saveCanvasState();
  state.fCanvas.on('object:added', () => { if (!state.isUndoRedo) { saveCanvasState(); markInitialSettingEnabled('sketch'); } });
  state.fCanvas.on('object:modified', () => { if (!state.isUndoRedo) saveCanvasState(); });
  state.fCanvas.on('object:removed', () => { if (!state.isUndoRedo) saveCanvasState(); });
  state.fCanvas.on('selection:created', event => configureCanvasImageCropControl(event.selected?.[0]));
  state.fCanvas.on('selection:updated', event => configureCanvasImageCropControl(event.selected?.[0]));
  state.fCanvas.on('path:created', event => {
    event.path.isSketchStroke = state.canvasMode === 'draw';
    event.path.selectable = state.canvasMode === 'draw';
    event.path.evented = state.canvasMode === 'draw';
    event.path.globalCompositeOperation = state.canvasMode === 'erase' ? 'destination-out' : 'source-over';
    if (state.canvasMode === 'erase') {
      eraseIntersectedSketchLayers(event.path);
      return;
    }
    state.fCanvas.requestRenderAll();
    state.canvasHistory[state.historyIndex] = JSON.stringify(state.fCanvas.toJSON(['isSketchStroke', 'isSketchRaster']));
  });
}

export function renderCanvasControlIcon(context, left, top, styleOverride, fabricObject, text, color) {
  context.save();
  context.translate(left, top);
  context.fillStyle = color;
  context.beginPath(); context.arc(0, 0, 11, 0, Math.PI * 2); context.fill();
  context.fillStyle = '#0f172a'; context.font = 'bold 13px sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle';
  context.fillText(text, 0, 1);
  context.restore();
}

export function renderCropControlIcon(context, left, top) {
  context.save();
  context.translate(left, top);
  context.strokeStyle = '#fbbf24'; context.lineWidth = 1.4; context.lineCap = 'round'; context.lineJoin = 'round';
  context.beginPath();
  context.moveTo(-8, -4); context.lineTo(8, -4);
  context.moveTo(-8, 4); context.lineTo(8, 4);
  context.moveTo(-4, -8); context.lineTo(-4, 8);
  context.moveTo(4, -8); context.lineTo(4, 8);
  context.moveTo(-4, 4); context.lineTo(8, -8);
  context.stroke();
  context.restore();
}

export function getOwnCanvasControls(object) {
  if (!Object.prototype.hasOwnProperty.call(object, 'controls')) object.controls = { ...(object.controls || {}) };
  return object.controls;
}

export function configureCanvasImageCropControl(object) {
  if (!object || object.type !== 'image' || object.isSketchRaster || object.isCropFrame || !window.fabric?.Control) return;
  object.set({ snapAngle: 45, snapThreshold: 8 });
  const controls = getOwnCanvasControls(object);
  delete controls.applyCrop;
  if (controls.crop) return;
  controls.crop = new fabric.Control({
    x: 0.5, y: -0.5, offsetX: 16, offsetY: -16, cursorStyle: 'pointer',
    mouseUpHandler: (_, transform) => { enterCanvasImageCropMode(transform.target); return true; },
    render: (ctx, left, top) => renderCropControlIcon(ctx, left, top)
  });
  state.fCanvas.requestRenderAll();
}

