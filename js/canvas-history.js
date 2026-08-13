// Canvas undo/redo history management.
function saveCanvasState() {
  const json = JSON.stringify(fCanvas.toJSON(['isSketchStroke', 'isSketchRaster']));
  if (historyIndex < canvasHistory.length - 1) {
    canvasHistory = canvasHistory.slice(0, historyIndex + 1);
  }
  canvasHistory.push(json);
  historyIndex = canvasHistory.length - 1;
  updateUndoRedoButtons();
}

function undoCanvas() {
  if (historyIndex <= 0) return;
  isUndoRedo = true;
  historyIndex--;
  fCanvas.loadFromJSON(canvasHistory[historyIndex], () => {
    fCanvas.renderAll();
    isUndoRedo = false;
    updateUndoRedoButtons();
  });
}

function redoCanvas() {
  if (historyIndex >= canvasHistory.length - 1) return;
  isUndoRedo = true;
  historyIndex++;
  fCanvas.loadFromJSON(canvasHistory[historyIndex], () => {
    fCanvas.renderAll();
    isUndoRedo = false;
    updateUndoRedoButtons();
  });
}

function updateUndoRedoButtons() {
  const undo = document.getElementById('btnUndo');
  const redo = document.getElementById('btnRedo');
  if (undo) undo.disabled = historyIndex <= 0;
  if (redo) redo.disabled = historyIndex >= canvasHistory.length - 1;
}
