// Drawing color and brush-size controls.
import { state } from './state.js';

export function setCanvasColor(color) {
  state.currentDrawingColor = color;
  state.fCanvas.freeDrawingBrush.color = color;
  document.getElementById('customCanvasColor').value = color;
  const activeObject = state.fCanvas.getActiveObject();
  if (activeObject?.type !== 'i-text') return;
  activeObject.set('fill', color);
  state.fCanvas.requestRenderAll();
  saveCanvasState();
}

export function setCanvasBrushSize(type, value) {
  const size = Number(value);
  if (type === 'draw') {
    state.drawBrushWidth = size;
    document.getElementById('drawBrushSizeValue').textContent = size;
  } else {
    state.eraserBrushWidth = size;
    document.getElementById('eraserBrushSizeValue').textContent = size;
  }
  if (state.fCanvas && state.canvasMode === type) state.fCanvas.freeDrawingBrush.width = size;
}

