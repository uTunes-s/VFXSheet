// Drawing color and brush-size controls.
import { state } from './state.js';
import { saveCanvasState } from './canvas-history.js';

export function setCanvasColor(color) {
  state.currentDrawingColor = color;
  if (!state.fCanvas) return;
  state.fCanvas.freeDrawingBrush.color = color;
  document.getElementById('customCanvasColor').value = color;
  document.querySelectorAll('[data-action="set-canvas-color"][data-color]').forEach(button => {
    const selected = button.dataset.color.toLowerCase() === color.toLowerCase();
    button.setAttribute('aria-pressed', String(selected));
    button.classList.toggle('ring-2', selected);
    button.classList.toggle('ring-white', selected);
  });
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

