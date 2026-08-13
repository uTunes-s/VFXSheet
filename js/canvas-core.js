// Fabric canvas initialization and image crop-control registration.
function initFabricCanvas() {
  fCanvas = new fabric.Canvas('noteCanvas', {
    isDrawingMode: true,
    backgroundColor: '#090d16',
    preserveObjectStacking: true
  });
  fCanvas.freeDrawingBrush.color = currentDrawingColor;
  fCanvas.freeDrawingBrush.width = drawBrushWidth;
  fCanvas.upperCanvasEl.style.touchAction = 'pan-y pinch-zoom';

  fCanvas.upperCanvasEl.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch') return;
    event.stopImmediatePropagation();
    fCanvas.isDrawingMode = false;
  }, true);

  saveCanvasState();
  fCanvas.on('object:added', () => { if (!isUndoRedo) { saveCanvasState(); markInitialSettingEnabled('sketch'); } });
  fCanvas.on('object:modified', () => { if (!isUndoRedo) saveCanvasState(); });
  fCanvas.on('object:removed', () => { if (!isUndoRedo) saveCanvasState(); });
  fCanvas.on('selection:created', event => configureCanvasImageCropControl(event.selected?.[0]));
  fCanvas.on('selection:updated', event => configureCanvasImageCropControl(event.selected?.[0]));
  fCanvas.on('path:created', event => {
    event.path.isSketchStroke = canvasMode === 'draw';
    event.path.selectable = canvasMode === 'draw';
    event.path.evented = canvasMode === 'draw';
    event.path.globalCompositeOperation = canvasMode === 'erase' ? 'destination-out' : 'source-over';
    if (canvasMode === 'erase') {
      eraseIntersectedSketchLayers(event.path);
      return;
    }
    fCanvas.requestRenderAll();
    canvasHistory[historyIndex] = JSON.stringify(fCanvas.toJSON(['isSketchStroke', 'isSketchRaster']));
  });
}

function renderCanvasControlIcon(context, left, top, styleOverride, fabricObject, text, color) {
  context.save();
  context.translate(left, top);
  context.fillStyle = color;
  context.beginPath(); context.arc(0, 0, 11, 0, Math.PI * 2); context.fill();
  context.fillStyle = '#0f172a'; context.font = 'bold 13px sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle';
  context.fillText(text, 0, 1);
  context.restore();
}

function renderCropControlIcon(context, left, top) {
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

function getOwnCanvasControls(object) {
  if (!Object.prototype.hasOwnProperty.call(object, 'controls')) object.controls = { ...(object.controls || {}) };
  return object.controls;
}

function configureCanvasImageCropControl(object) {
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
  fCanvas.requestRenderAll();
}
