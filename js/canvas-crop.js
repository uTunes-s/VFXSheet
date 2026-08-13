// Fabric image crop mode, source overlays, and crop application.
function enterCanvasImageCropMode(image) {
  if (!image || image.angle) return alert('Reset the image rotation to 0° before cropping.');
  const bounds = image.getBoundingRect(true, true);
  const sourceWidth = image._element?.naturalWidth || image._element?.width || image.width;
  const sourceHeight = image._element?.naturalHeight || image._element?.height || image.height;
  const sourceBounds = {
    left: image.left - (image.cropX || 0) * image.scaleX,
    top: image.top - (image.cropY || 0) * image.scaleY,
    width: sourceWidth * image.scaleX,
    height: sourceHeight * image.scaleY
  };
  const frame = new fabric.Rect({
    left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height,
    fill: 'rgba(251, 191, 36, 0.06)', stroke: '#fbbf24', strokeWidth: 2,
    strokeDashArray: [6, 4], cornerColor: '#fbbf24', cornerSize: 12,
    transparentCorners: false, isCropFrame: true, cropTarget: image, cropSourceBounds: sourceBounds,
    lockRotation: true, originX: 'left', originY: 'top'
  });
  const sourcePreview = new fabric.Image(image._element, {
    left: sourceBounds.left, top: sourceBounds.top, width: sourceWidth, height: sourceHeight,
    scaleX: image.scaleX, scaleY: image.scaleY, originX: 'left', originY: 'top',
    selectable: false, evented: false, excludeFromExport: true, isCropSourcePreview: true
  });
  frame.cropSourcePreview = sourcePreview;
  const frameControls = getOwnCanvasControls(frame);
  delete frameControls.crop;
  frameControls.applyCrop = new fabric.Control({
    x: 0.5, y: -0.5, offsetX: 16, offsetY: -16, cursorStyle: 'pointer',
    mouseUpHandler: (_, transform) => { applyCanvasImageCrop(transform.target); return true; },
    render: (ctx, left, top, style, target) => renderCanvasControlIcon(ctx, left, top, style, target, '✓', '#84cc16')
  });
  image.selectable = false;
  image.evented = false;
  const overlays = Array.from({ length: 4 }, () => new fabric.Rect({ fill: 'rgba(2, 6, 23, 0.68)', selectable: false, evented: false, excludeFromExport: true, isCropOverlay: true }));
  frame.cropOverlays = overlays;
  const imageIndex = fCanvas.getObjects().indexOf(image);
  fCanvas.add(sourcePreview);
  fCanvas.moveTo(sourcePreview, imageIndex);
  fCanvas.add(...overlays, frame);
  const refreshOverlays = () => updateCanvasCropOverlays(frame);
  frame.on('moving', refreshOverlays);
  frame.on('scaling', refreshOverlays);
  frame.on('modified', refreshOverlays);
  updateCanvasCropOverlays(frame);
  fCanvas.setActiveObject(frame);
  fCanvas.requestRenderAll();
}

function updateCanvasCropOverlays(frame) {
  const bounds = frame.getBoundingRect(true, true);
  const source = frame.cropSourceBounds;
  const sourceLeft = source.left;
  const sourceTop = source.top;
  const sourceRight = source.left + source.width;
  const sourceBottom = source.top + source.height;
  const left = Math.max(sourceLeft, bounds.left);
  const top = Math.max(sourceTop, bounds.top);
  const right = Math.min(sourceRight, bounds.left + bounds.width);
  const bottom = Math.min(sourceBottom, bounds.top + bounds.height);
  const rectangles = [
    [sourceLeft, sourceTop, source.width, Math.max(0, top - sourceTop)],
    [sourceLeft, bottom, source.width, Math.max(0, sourceBottom - bottom)],
    [sourceLeft, top, Math.max(0, left - sourceLeft), Math.max(0, bottom - top)],
    [right, top, Math.max(0, sourceRight - right), Math.max(0, bottom - top)]
  ];
  frame.cropOverlays.forEach((overlay, index) => overlay.set({ left: rectangles[index][0], top: rectangles[index][1], width: rectangles[index][2], height: rectangles[index][3] }));
  frame.cropOverlays.forEach(overlay => fCanvas.moveTo(overlay, fCanvas.getObjects().indexOf(frame) - 1));
  frame.setCoords();
  fCanvas.requestRenderAll();
}

function applyCanvasImageCrop(frame) {
  const image = frame?.cropTarget;
  if (!image) return;
  const imageBounds = frame.cropSourceBounds;
  const cropBounds = frame.getBoundingRect(true, true);
  const left = Math.max(imageBounds.left, cropBounds.left);
  const top = Math.max(imageBounds.top, cropBounds.top);
  const right = Math.min(imageBounds.left + imageBounds.width, cropBounds.left + cropBounds.width);
  const bottom = Math.min(imageBounds.top + imageBounds.height, cropBounds.top + cropBounds.height);
  if (right - left < 4 || bottom - top < 4) return alert('Create a crop area within the image.');
  const scaleX = image.scaleX;
  const scaleY = image.scaleY;
  image.set({ cropX: (left - imageBounds.left) / scaleX, cropY: (top - imageBounds.top) / scaleY, width: (right - left) / scaleX, height: (bottom - top) / scaleY, left, top, selectable: true, evented: true });
  image.setCoords();
  fCanvas.discardActiveObject();
  [...(frame.cropOverlays || []), frame.cropSourcePreview, frame].filter(Boolean).forEach(object => fCanvas.remove(object));
  configureCanvasImageCropControl(image);
  fCanvas.setActiveObject(image);
  fCanvas.requestRenderAll();
  saveCanvasState();
}
