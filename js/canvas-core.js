// Fabric canvas initialization and image crop-control registration.
import { state } from './state.js';
import { saveCanvasState } from './canvas-history.js';
import { markInitialSettingEnabled } from './initial-settings-ui.js';
import { eraseIntersectedSketchLayers } from './canvas-eraser.js';
import { enterCanvasImageCropMode } from './canvas-crop.js';
import { openNativeTextEditor } from './canvas-text.js';

function getPathEndpoints(path) {
  const points = path.path
    .filter(command => command.length >= 3)
    .map(command => ({ x: command[command.length - 2], y: command[command.length - 1] }));
  return { points, start: points[0], end: points.at(-1) };
}

function simplifyPathPoints(points, tolerance = 2) {
  if (points.length < 3) return points;
  const start = points[0];
  const end = points.at(-1);
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  let maxDistance = 0;
  let splitIndex = 0;
  points.slice(1, -1).forEach((point, index) => {
    const distance = length
      ? Math.abs((end.y - start.y) * point.x - (end.x - start.x) * point.y + end.x * start.y - end.y * start.x) / length
      : Math.hypot(point.x - start.x, point.y - start.y);
    if (distance > maxDistance) {
      maxDistance = distance;
      splitIndex = index + 1;
    }
  });
  if (maxDistance <= tolerance) return [start, end];
  return [...simplifyPathPoints(points.slice(0, splitIndex + 1), tolerance), ...simplifyPathPoints(points.slice(splitIndex), tolerance).slice(1)];
}

function createBezierPath(points) {
  const segments = [['M', points[0].x, points[0].y]];
  for (let index = 0; index < points.length - 1; index++) {
    const previous = points[Math.max(0, index - 1)];
    const current = points[index];
    const next = points[index + 1];
    const following = points[Math.min(points.length - 1, index + 2)];
    segments.push([
      'C',
      current.x + (next.x - previous.x) / 6,
      current.y + (next.y - previous.y) / 6,
      next.x - (following.x - current.x) / 6,
      next.y - (following.y - current.y) / 6,
      next.x,
      next.y
    ]);
  }
  return segments;
}

function simplifyHeldStroke(path) {
  const { points, start, end } = getPathEndpoints(path);
  if (!start || !end || points.length < 2) return;
  const distance = Math.hypot(end.x - start.x, end.y - start.y);
  if (distance < 8) return;
  const deviation = Math.max(...points.map(point => Math.abs((end.y - start.y) * point.x - (end.x - start.x) * point.y + end.x * start.y - end.y * start.x) / distance));
  if (deviation < 14) {
    path.set({ path: [['M', start.x, start.y], ['L', end.x, end.y]] });
  } else {
    path.set({ path: createBezierPath(simplifyPathPoints(points)) });
  }
  path.setCoords();
}

function clearDrawHoldTimer() {
  if (state.drawHoldTimer) clearTimeout(state.drawHoldTimer);
  state.drawHoldTimer = null;
}

export function initFabricCanvas() {
  state.fCanvas = new fabric.Canvas('noteCanvas', {
    isDrawingMode: true,
    backgroundColor: '#090d16',
    preserveObjectStacking: true
  });
  state.fCanvas.freeDrawingBrush.color = state.currentDrawingColor;
  state.fCanvas.freeDrawingBrush.width = state.drawBrushWidth;
  state.fCanvas.upperCanvasEl.style.touchAction = 'pan-y pinch-zoom';

  state.fCanvas.on('mouse:down', event => {
    state.drawHoldShouldSimplify = false;
    if (state.canvasMode !== 'draw') return;
    state.drawHoldStart = event.pointer;
    state.drawHoldHasMoved = false;
    clearDrawHoldTimer();
  });
  state.fCanvas.on('mouse:move', event => {
    if (state.canvasMode !== 'draw' || !state.drawHoldStart) return;
    const distance = Math.hypot(event.pointer.x - state.drawHoldStart.x, event.pointer.y - state.drawHoldStart.y);
    if (distance > 8) state.drawHoldHasMoved = true;
    if (!state.drawHoldHasMoved) return;
    clearDrawHoldTimer();
    state.drawHoldTimer = setTimeout(() => { state.drawHoldShouldSimplify = true; }, 600);
  });
  state.fCanvas.on('mouse:up', () => {
    clearDrawHoldTimer();
    state.drawHoldStart = null;
    state.drawHoldHasMoved = false;
  });

  saveCanvasState();
  state.fCanvas.on('object:added', event => { if (['i-text', 'textbox'].includes(event.target?.type)) event.target.set('editable', false); if (!state.isUndoRedo) { saveCanvasState(); markInitialSettingEnabled('sketch'); if (state.isEditingInModal) state.isEditorDirty = true; } });
  state.fCanvas.on('object:modified', () => { if (!state.isUndoRedo) { saveCanvasState(); if (state.isEditingInModal) state.isEditorDirty = true; } });
  state.fCanvas.on('object:removed', () => { if (!state.isUndoRedo) { saveCanvasState(); if (state.isEditingInModal) state.isEditorDirty = true; } });
  state.fCanvas.on('selection:created', event => configureCanvasImageCropControl(event.selected?.[0]));
  state.fCanvas.on('selection:updated', event => configureCanvasImageCropControl(event.selected?.[0]));
  state.fCanvas.on('path:created', event => {
    if (state.drawHoldShouldSimplify && state.canvasMode === 'draw') simplifyHeldStroke(event.path);
    state.drawHoldShouldSimplify = false;
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
  state.fCanvas.on('mouse:dblclick', event => {
    const target = event.target;
    if (!['i-text', 'textbox'].includes(target?.type)) return;
    event.e?.preventDefault();
    openNativeTextEditor({ x: target.left, y: target.top }, target);
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

