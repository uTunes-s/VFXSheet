// Canvas undo/redo history management.
export function saveCanvasState() {
  const json = JSON.stringify(fCanvas.toJSON(['isSketchStroke', 'isSketchRaster']));
  if (historyIndex < canvasHistory.length - 1) {
    canvasHistory = canvasHistory.slice(0, historyIndex + 1);
  }
  canvasHistory.push(json);
  historyIndex = canvasHistory.length - 1;
  updateUndoRedoButtons();
}

export function undoCanvas() {
  if (historyIndex <= 0) return;
  isUndoRedo = true;
  historyIndex--;
  fCanvas.loadFromJSON(canvasHistory[historyIndex], () => {
    fCanvas.renderAll();
    isUndoRedo = false;
    updateUndoRedoButtons();
  });
}

export function redoCanvas() {
  if (historyIndex >= canvasHistory.length - 1) return;
  isUndoRedo = true;
  historyIndex++;
  fCanvas.loadFromJSON(canvasHistory[historyIndex], () => {
    fCanvas.renderAll();
    isUndoRedo = false;
    updateUndoRedoButtons();
  });
}

export function updateUndoRedoButtons() {
  const undo = document.getElementById('btnUndo');
  const redo = document.getElementById('btnRedo');
  if (undo) undo.disabled = historyIndex <= 0;
  if (redo) redo.disabled = historyIndex >= canvasHistory.length - 1;
}

Object.assign(globalThis, { saveCanvasState, undoCanvas, redoCanvas, updateUndoRedoButtons });
