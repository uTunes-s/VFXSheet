// Canvas undo/redo history management.
import { state } from './state.js';

export function saveCanvasState() {
  const json = JSON.stringify(state.fCanvas.toJSON(['isSketchStroke', 'isSketchRaster']));
  if (state.historyIndex < state.canvasHistory.length - 1) {
    state.canvasHistory = state.canvasHistory.slice(0, state.historyIndex + 1);
  }
  state.canvasHistory.push(json);
  state.historyIndex = state.canvasHistory.length - 1;
  updateUndoRedoButtons();
}

export function undoCanvas() {
  if (state.historyIndex <= 0) return;
  state.isUndoRedo = true;
  state.historyIndex--;
  state.fCanvas.loadFromJSON(state.canvasHistory[state.historyIndex], () => {
    state.fCanvas.renderAll();
    state.isUndoRedo = false;
    updateUndoRedoButtons();
  });
}

export function redoCanvas() {
  if (state.historyIndex >= state.canvasHistory.length - 1) return;
  state.isUndoRedo = true;
  state.historyIndex++;
  state.fCanvas.loadFromJSON(state.canvasHistory[state.historyIndex], () => {
    state.fCanvas.renderAll();
    state.isUndoRedo = false;
    updateUndoRedoButtons();
  });
}

export function updateUndoRedoButtons() {
  const undo = document.getElementById('btnUndo');
  const redo = document.getElementById('btnRedo');
  if (undo) undo.disabled = state.historyIndex <= 0;
  if (redo) redo.disabled = state.historyIndex >= state.canvasHistory.length - 1;
}

