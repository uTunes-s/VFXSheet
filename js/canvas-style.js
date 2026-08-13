// Drawing color and brush-size controls.
function setCanvasColor(color) {
  currentDrawingColor = color;
  fCanvas.freeDrawingBrush.color = color;
  document.getElementById('customCanvasColor').value = color;
  const activeObject = fCanvas.getActiveObject();
  if (activeObject?.type !== 'i-text') return;
  activeObject.set('fill', color);
  fCanvas.requestRenderAll();
  saveCanvasState();
}

function setCanvasBrushSize(type, value) {
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
