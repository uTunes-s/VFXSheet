// Canvas toolbar actions and serialization helpers.
import { state } from './state.js';
import { saveCanvasState } from './canvas-history.js';
import { setCanvasMode } from './canvas-mode.js';

export function moveSelectedLayer(direction) {
  const active = state.fCanvas?.getActiveObject();
  if (!active) return alert('Select a sketch object first.');
  if (direction === 'front') state.fCanvas.bringForward(active);
  if (direction === 'back') state.fCanvas.sendBackwards(active);
  if (direction === 'top') state.fCanvas.bringToFront(active);
  if (direction === 'bottom') state.fCanvas.sendToBack(active);
  state.fCanvas.renderAll();
  saveCanvasState();
}

export function addTextToNote() {
  const text = new fabric.IText('Text...', {
    left: 100,
    top: 100,
    fontFamily: 'sans-serif',
    fill: state.currentDrawingColor,
    fontSize: 18
  });
  state.fCanvas.add(text);
  state.fCanvas.setActiveObject(text);
  setCanvasMode('select');
}

export function deleteSelected() {
  const activeObjects = state.fCanvas.getActiveObjects();
  if (!activeObjects.length) return;
  activeObjects.forEach(object => state.fCanvas.remove(object));
  state.fCanvas.discardActiveObject();
  state.fCanvas.requestRenderAll();
}

export function clearNoteCanvas() {
  state.fCanvas.clear();
  state.fCanvas.setBackgroundColor('#090d16', () => {
    state.fCanvas.renderAll();
    state.canvasHistory = [];
    state.historyIndex = -1;
    saveCanvasState();
  });
}

export function exportCanvasToDataURL() {
  return state.fCanvas.toDataURL({ format: 'png', multiplier: 1 });
}

export function exportCanvasToBlob() {
  return fetch(exportCanvasToDataURL()).then(response => response.blob());
}

