// Canvas draw, erase, and selection mode controls.
import { state } from './state.js';

export function setCanvasMode(mode) {
  const draw = document.getElementById('btnDraw');
  const select = document.getElementById('btnSelect');
  const erase = document.getElementById('btnErase');
  const addText = document.getElementById('btnAddText');
  const active = 'canvas-toolbar-button bg-amber-500 text-slate-950 font-bold p-2 rounded-lg inline-flex items-center justify-center';
  const inactive = 'canvas-toolbar-button bg-slate-800 hover:bg-slate-700 p-2 rounded-lg border border-slate-700 inline-flex items-center justify-center';
  if (state.pendingTextPlacementHandler) {
    state.fCanvas.off('mouse:down', state.pendingTextPlacementHandler);
    state.pendingTextPlacementHandler = null;
    state.fCanvas.defaultCursor = 'default';
  }
  state.isTextToolActive = false;
  addText?.setAttribute('aria-pressed', 'false');
  addText?.classList.remove('bg-amber-500', 'text-slate-950', 'font-bold');
  addText?.classList.add('bg-slate-800', 'hover:bg-slate-700', 'border', 'border-slate-700');
  state.canvasMode = mode;
  if (mode === 'draw') {
    state.fCanvas.isDrawingMode = true;
    state.fCanvas.freeDrawingBrush.color = state.currentDrawingColor;
    state.fCanvas.freeDrawingBrush.width = state.drawBrushWidth;
    draw.className = active; select.className = inactive; erase.className = inactive;
  } else if (mode === 'erase') {
    state.fCanvas.isDrawingMode = true;
    state.fCanvas.freeDrawingBrush.color = 'rgba(0, 0, 0, 1)';
    state.fCanvas.freeDrawingBrush.width = state.eraserBrushWidth;
    erase.className = active; draw.className = inactive; select.className = inactive;
  } else {
    state.fCanvas.isDrawingMode = false;
    select.className = active; draw.className = inactive; erase.className = inactive;
  }
}

