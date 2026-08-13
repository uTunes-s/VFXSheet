// Canvas toolbar actions and serialization helpers.
function moveSelectedLayer(direction) {
  const active = fCanvas?.getActiveObject();
  if (!active) return alert('Select a sketch object first.');
  if (direction === 'front') fCanvas.bringForward(active);
  if (direction === 'back') fCanvas.sendBackwards(active);
  if (direction === 'top') fCanvas.bringToFront(active);
  if (direction === 'bottom') fCanvas.sendToBack(active);
  fCanvas.renderAll();
  saveCanvasState();
}

function addTextToNote() {
  const text = new fabric.IText('Text...', {
    left: 100,
    top: 100,
    fontFamily: 'sans-serif',
    fill: currentDrawingColor,
    fontSize: 18
  });
  fCanvas.add(text);
  fCanvas.setActiveObject(text);
  setCanvasMode('select');
}

function deleteSelected() {
  const activeObjects = fCanvas.getActiveObjects();
  if (!activeObjects.length) return;
  activeObjects.forEach(object => fCanvas.remove(object));
  fCanvas.discardActiveObject();
  fCanvas.requestRenderAll();
}

function clearNoteCanvas() {
  fCanvas.clear();
  fCanvas.setBackgroundColor('#090d16', () => {
    fCanvas.renderAll();
    canvasHistory = [];
    historyIndex = -1;
    saveCanvasState();
  });
}

function exportCanvasToDataURL() {
  return fCanvas.toDataURL({ format: 'png', multiplier: 1 });
}

function exportCanvasToBlob() {
  return fetch(exportCanvasToDataURL()).then(response => response.blob());
}
