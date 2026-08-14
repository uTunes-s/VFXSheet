// Drawing color and brush-size controls.
import { state } from './state.js';

export function setCanvasColor(color) {
  state.currentDrawingColor = color;
  fCanvas.freeDrawingBrush.color = color;
  document.getElementById('customCanvasColor').value = color;
  const activeObject = fCanvas.getActiveObject();
  if (activeObject?.type !== 'i-text') return;
  activeObject.set('fill', color);
  fCanvas.requestRenderAll();
  saveCanvasState();
}

export function setCanvasBrushSize(type, value) {
  const size = Number(value);
  if (type === 'draw') {
    drawBrushWidth = size;
    document.getElementById('drawBrushSizeValue').textContent = size;
  } else {
    eraserBrushWidth = size;
    document.getElementById('eraserBrushSizeValue').textContent = size;
  }
  if (fCanvas && canvasMode === type) fCanvas.freeDrawingBrush.width = size;
}

Object.assign(globalThis, { setCanvasColor, setCanvasBrushSize });
