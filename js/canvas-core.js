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

function createClosedBezierPath(points) {
  const segments = [['M', points[0].x, points[0].y]];
  points.forEach((current, index) => {
    const previous = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];
    const following = points[(index + 2) % points.length];
    segments.push([
      'C',
      current.x + (next.x - previous.x) / 6,
      current.y + (next.y - previous.y) / 6,
      next.x - (following.x - current.x) / 6,
      next.y - (following.y - current.y) / 6,
      next.x,
      next.y
    ]);
  });
  segments.push(['Z']);
  return segments;
}

const ORTHOGONAL_SNAP_ANGLE = 15 * Math.PI / 180;

function pointToSegmentDistance(point, start, end) {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const lengthSquared = deltaX ** 2 + deltaY ** 2;
  if (!lengthSquared) return Math.hypot(point.x - start.x, point.y - start.y);
  const ratio = Math.max(0, Math.min(1, ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) / lengthSquared));
  return Math.hypot(point.x - (start.x + deltaX * ratio), point.y - (start.y + deltaY * ratio));
}

function projectPointOntoSegment(point, start, end) {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const lengthSquared = deltaX ** 2 + deltaY ** 2;
  if (!lengthSquared) return { ...start };
  const ratio = Math.max(0, Math.min(1, ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) / lengthSquared));
  return { x: start.x + deltaX * ratio, y: start.y + deltaY * ratio };
}

function findClosingPoint(points, threshold) {
  const end = points.at(-1);
  const segmentCount = Math.max(1, Math.floor((points.length - 1) * 0.2));
  for (let index = 0; index < segmentCount; index++) {
    const start = points[index];
    const next = points[index + 1];
    if (pointToSegmentDistance(end, start, next) <= threshold) return projectPointOntoSegment(end, start, next);
  }
  return null;
}

function isNearlyHorizontalOrVertical(start, end) {
  const angle = Math.atan2(Math.abs(end.y - start.y), Math.abs(end.x - start.x));
  if (angle <= ORTHOGONAL_SNAP_ANGLE) return 'horizontal';
  if (Math.abs(Math.PI / 2 - angle) <= ORTHOGONAL_SNAP_ANGLE) return 'vertical';
  return null;
}

function snapOrthogonalVertices(vertices) {
  const snapped = vertices.map(point => ({ ...point }));
  for (let index = 1; index < snapped.length; index++) {
    const direction = isNearlyHorizontalOrVertical(vertices[index - 1], vertices[index]);
    if (direction === 'horizontal') snapped[index].y = snapped[index - 1].y;
    if (direction === 'vertical') snapped[index].x = snapped[index - 1].x;
  }
  const closingDirection = isNearlyHorizontalOrVertical(vertices.at(-1), vertices[0]);
  if (closingDirection === 'horizontal') snapped.at(-1).y = snapped[0].y;
  if (closingDirection === 'vertical') snapped.at(-1).x = snapped[0].x;
  return snapped;
}

function isPolygonalShape(points) {
  if (points.length < 3 || points.length > 10) return false;
  const sharpCornerCount = points.filter((point, index) => {
    const previous = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];
    const incomingX = point.x - previous.x;
    const incomingY = point.y - previous.y;
    const outgoingX = next.x - point.x;
    const outgoingY = next.y - point.y;
    const incomingLength = Math.hypot(incomingX, incomingY);
    const outgoingLength = Math.hypot(outgoingX, outgoingY);
    if (!incomingLength || !outgoingLength) return false;
    const dotProduct = (incomingX * outgoingX + incomingY * outgoingY) / (incomingLength * outgoingLength);
    return Math.acos(Math.max(-1, Math.min(1, dotProduct))) >= 35 * Math.PI / 180;
  }).length;
  return sharpCornerCount >= 3;
}

function getHeldStrokePath(points) {
  const start = points[0];
  const end = points.at(-1);
  if (!start || !end || points.length < 2) return;
  const distance = Math.hypot(end.x - start.x, end.y - start.y);
  const perimeter = points.slice(1).reduce((total, point, index) => total + Math.hypot(point.x - points[index].x, point.y - points[index].y), 0);
  if (perimeter < 8) return;
  const closureThreshold = Math.max(18, perimeter * 0.1);
  const closingPoint = distance <= closureThreshold ? { ...start } : findClosingPoint(points, closureThreshold);
  const shapePoints = closingPoint ? [...points.slice(0, -1), closingPoint] : points;
  const simplified = simplifyPathPoints(shapePoints, 4);
  const isClosed = Boolean(closingPoint) && simplified.length >= 4 && simplified.length <= 20;
  const deviation = Math.max(...points.map(point => Math.abs((end.y - start.y) * point.x - (end.x - start.x) * point.y + end.x * start.y - end.y * start.x) / distance));
  if (!isClosed && deviation < 14) {
    const direction = isNearlyHorizontalOrVertical(start, end);
    const snappedEnd = direction === 'horizontal' ? { x: end.x, y: start.y } : direction === 'vertical' ? { x: start.x, y: end.y } : end;
    return [['M', start.x, start.y], ['L', snappedEnd.x, snappedEnd.y]];
  }

  if (!isClosed) return createBezierPath(simplified);

  const closedPoints = snapOrthogonalVertices(simplified.slice(0, -1));
  if (isPolygonalShape(closedPoints)) return [['M', closedPoints[0].x, closedPoints[0].y], ...closedPoints.slice(1).map(point => ['L', point.x, point.y]), ['Z']];
  return createClosedBezierPath(closedPoints);
}

function simplifyHeldStroke(path) {
  const { points } = getPathEndpoints(path);
  const shapedPath = getHeldStrokePath(points);
  if (!shapedPath) return;
  path.set({ path: shapedPath });
  path.setCoords();
}

function clearDrawHoldTimer() {
  if (state.drawHoldTimer) clearTimeout(state.drawHoldTimer);
  state.drawHoldTimer = null;
}

function removeDrawHoldPreview() {
  if (!state.drawHoldPreview) return;
  state.fCanvas.remove(state.drawHoldPreview);
  state.drawHoldPreview = null;
}

function showDrawHoldPreview() {
  const points = state.fCanvas.freeDrawingBrush?._points?.map(point => ({ x: point.x, y: point.y })) || [];
  const shapedPath = getHeldStrokePath(points);
  if (!shapedPath) return;
  removeDrawHoldPreview();
  state.drawHoldPreview = new fabric.Path(shapedPath, {
    fill: null,
    stroke: state.currentDrawingColor,
    strokeWidth: state.drawBrushWidth,
    strokeLineCap: 'round',
    strokeLineJoin: 'round',
    selectable: false,
    evented: false,
    isSketchPreview: true,
    excludeFromExport: true
  });
  state.fCanvas.add(state.drawHoldPreview);
  state.fCanvas.clearContext(state.fCanvas.contextTop);
  state.fCanvas.requestRenderAll();
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
    removeDrawHoldPreview();
    state.drawHoldShouldSimplify = false;
    if (state.canvasMode !== 'draw') return;
    state.drawHoldStart = event.pointer;
    state.drawHoldHasMoved = false;
    clearDrawHoldTimer();
  });
  state.fCanvas.on('mouse:move', event => {
    if (state.canvasMode !== 'draw' || !state.drawHoldStart) return;
    if (state.drawHoldPreview) {
      removeDrawHoldPreview();
      state.drawHoldShouldSimplify = false;
    }
    const distance = Math.hypot(event.pointer.x - state.drawHoldStart.x, event.pointer.y - state.drawHoldStart.y);
    if (distance > 8) state.drawHoldHasMoved = true;
    if (!state.drawHoldHasMoved) return;
    clearDrawHoldTimer();
    state.drawHoldTimer = setTimeout(() => {
      state.drawHoldShouldSimplify = true;
      showDrawHoldPreview();
    }, 600);
  });
  state.fCanvas.on('mouse:up', () => {
    clearDrawHoldTimer();
    state.drawHoldStart = null;
    state.drawHoldHasMoved = false;
  });

  saveCanvasState();
  state.fCanvas.on('object:added', event => { if (event.target?.isSketchPreview) return; if (['i-text', 'textbox'].includes(event.target?.type)) event.target.set('editable', false); if (!state.isUndoRedo) { saveCanvasState(); markInitialSettingEnabled('sketch'); if (state.isEditingInModal) state.isEditorDirty = true; } });
  state.fCanvas.on('object:modified', () => { if (!state.isUndoRedo) { saveCanvasState(); if (state.isEditingInModal) state.isEditorDirty = true; } });
  state.fCanvas.on('object:removed', event => { if (event.target?.isSketchPreview) return; if (!state.isUndoRedo) { saveCanvasState(); if (state.isEditingInModal) state.isEditorDirty = true; } });
  state.fCanvas.on('selection:created', event => configureCanvasImageCropControl(event.selected?.[0]));
  state.fCanvas.on('selection:updated', event => configureCanvasImageCropControl(event.selected?.[0]));
  state.fCanvas.on('path:created', event => {
    removeDrawHoldPreview();
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

