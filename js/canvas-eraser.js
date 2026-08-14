// Fabric.js eraser collision and raster replacement operations.
import { state } from './state.js';
import { updateUndoRedoButtons } from './canvas-history.js';

export function objectsOverlap(first, second) {
  const a = first.getBoundingRect(true, true);
  const b = second.getBoundingRect(true, true);
  return a.left < b.left + b.width && a.left + a.width > b.left && a.top < b.top + b.height && a.top + a.height > b.top;
}

export async function rasterizeErasedSketchLayer(sketchLayer, eraserPath) {
  const rasterScale = 3;
  const layer = new fabric.StaticCanvas(document.createElement('canvas'), {
    width: state.fCanvas.width, height: state.fCanvas.height, enableRetinaScaling: false, renderOnAddRemove: false
  });
  try {
    const [sketchClone, eraserClone] = await Promise.all([sketchLayer, eraserPath].map(object => new Promise(resolve => object.clone(resolve, ['isSketchStroke', 'isSketchRaster']))));
    eraserClone.set({ globalCompositeOperation: 'destination-out', selectable: false, evented: false });
    layer.add(sketchClone, eraserClone);
    const rendered = layer.toCanvasElement(rasterScale);
    const pixels = rendered.getContext('2d').getImageData(0, 0, rendered.width, rendered.height).data;
    let minX = rendered.width, minY = rendered.height, maxX = -1, maxY = -1;
    for (let y = 0; y < rendered.height; y++) for (let x = 0; x < rendered.width; x++) {
      if (pixels[(y * rendered.width + x) * 4 + 3] === 0) continue;
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    if (maxX < minX || maxY < minY) return null;
    const padding = rasterScale * 3;
    minX = Math.max(0, minX - padding); minY = Math.max(0, minY - padding);
    maxX = Math.min(rendered.width - 1, maxX + padding); maxY = Math.min(rendered.height - 1, maxY + padding);
    const cropped = document.createElement('canvas');
    cropped.width = maxX - minX + 1; cropped.height = maxY - minY + 1;
    cropped.getContext('2d').drawImage(rendered, minX, minY, cropped.width, cropped.height, 0, 0, cropped.width, cropped.height);
    return new Promise(resolve => fabric.Image.fromURL(cropped.toDataURL('image/png'), image => {
      image.set({
        left: minX / rasterScale, top: minY / rasterScale, scaleX: 1 / rasterScale, scaleY: 1 / rasterScale,
        originX: 'left', originY: 'top', selectable: true, evented: true, objectCaching: false, isSketchRaster: true
      });
      resolve(image);
    }));
  } finally {
    layer.dispose();
  }
}

export async function eraseIntersectedSketchLayers(eraserPath) {
  const targets = state.fCanvas.getObjects().filter(object => (object.isSketchStroke || object.isSketchRaster) && objectsOverlap(object, eraserPath));
  state.isUndoRedo = true;
  try {
    state.fCanvas.remove(eraserPath);
    for (const target of targets) {
      const index = state.fCanvas.getObjects().indexOf(target);
      if (index < 0) continue;
      const replacement = await rasterizeErasedSketchLayer(target, eraserPath);
      state.fCanvas.remove(target);
      if (replacement) {
        state.fCanvas.add(replacement);
        state.fCanvas.moveTo(replacement, index);
      }
    }
  } finally {
    state.isUndoRedo = false;
  }
  state.fCanvas.requestRenderAll();
  state.canvasHistory[state.historyIndex] = JSON.stringify(state.fCanvas.toJSON(['isSketchStroke', 'isSketchRaster']));
  updateUndoRedoButtons();
}

Object.assign(globalThis, { objectsOverlap, rasterizeErasedSketchLayer, eraseIntersectedSketchLayers });
