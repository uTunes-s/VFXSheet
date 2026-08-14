// Add user-selected images to the Fabric canvas.
import { state } from './state.js';
import { configureCanvasImageCropControl } from './canvas-core.js';
import { setCanvasMode } from './canvas-mode.js';

export function addFreeImageToCanvas(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = loadEvent => {
    fabric.Image.fromURL(loadEvent.target.result, image => {
      image.scaleToWidth(280);
      image.set({
        left: 50 + Math.random() * 50,
        top: 50 + Math.random() * 50,
        cornerColor: '#f59e0b',
        cornerSize: 10,
        transparentCorners: false
      });
      state.fCanvas.add(image);
      configureCanvasImageCropControl(image);
      state.fCanvas.setActiveObject(image);
      setCanvasMode('select');
    });
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

Object.assign(globalThis, { addFreeImageToCanvas });
