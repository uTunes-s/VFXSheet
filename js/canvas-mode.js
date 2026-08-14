// Canvas draw, erase, and selection mode controls.
import { state } from './state.js';

export function setCanvasMode(mode) {
  const draw = document.getElementById('btnDraw');
  const select = document.getElementById('btnSelect');
  const erase = document.getElementById('btnErase');
  const active = 'bg-amber-500 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg';
  const inactive = 'bg-slate-800 hover:bg-slate-700 text-xs px-3 py-1.5 rounded-lg border border-slate-700';
  canvasMode = mode;
  if (mode === 'draw') {
    fCanvas.isDrawingMode = true;
    fCanvas.freeDrawingBrush.color = state.currentDrawingColor;
    fCanvas.freeDrawingBrush.width = drawBrushWidth;
    draw.className = active; select.className = inactive; erase.className = inactive;
  } else if (mode === 'erase') {
    fCanvas.isDrawingMode = true;
    fCanvas.freeDrawingBrush.color = 'rgba(0, 0, 0, 1)';
    fCanvas.freeDrawingBrush.width = eraserBrushWidth;
    erase.className = active; draw.className = inactive; select.className = inactive;
  } else {
    fCanvas.isDrawingMode = false;
    select.className = active; draw.className = inactive; erase.className = inactive;
  }
}

Object.assign(globalThis, { setCanvasMode });
