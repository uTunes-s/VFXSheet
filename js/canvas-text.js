// Native textarea overlay for Sketch text entry on iPad.
import { state } from './state.js';
import { saveCanvasState } from './canvas-history.js';

function closeNativeTextEditor(commit = true) {
  const editor = state.nativeTextEditor;
  if (!editor) return;
  state.nativeTextEditor = null;
  editor.removeEventListener('blur', editor.finish);
  editor.remove();

  const value = editor.value;
  if (!commit || !value) return;
  if (editor.target) {
    editor.target.set({ text: value });
    editor.target.setCoords();
    state.fCanvas.setActiveObject(editor.target);
    state.fCanvas.requestRenderAll();
    saveCanvasState();
    if (state.isEditingInModal) state.isEditorDirty = true;
    return;
  }

  const text = new fabric.Textbox(value, {
    left: editor.canvasPoint.x,
    top: editor.canvasPoint.y,
    width: 240,
    fontFamily: 'sans-serif',
    fill: state.currentDrawingColor,
    fontSize: 18,
    editable: false,
    isSketchText: true
  });
  state.fCanvas.add(text);
  state.fCanvas.setActiveObject(text);
  state.fCanvas.requestRenderAll();
}

export function openNativeTextEditor(canvasPoint, target = null) {
  closeNativeTextEditor();
  const wrapper = state.fCanvas?.wrapperEl;
  if (!wrapper) return;

  const scale = wrapper.getBoundingClientRect().width / state.fCanvas.getWidth();
  const editor = document.createElement('textarea');
  editor.className = 'canvas-native-text-editor';
  editor.value = target?.text || '';
  editor.rows = 1;
  editor.setAttribute('aria-label', 'Sketch text');
  editor.style.left = `${(target?.left ?? canvasPoint.x) * scale}px`;
  editor.style.top = `${(target?.top ?? canvasPoint.y) * scale}px`;
  editor.style.width = `${(target?.width ?? 240) * scale}px`;
  editor.style.fontSize = `${(target?.fontSize ?? 18) * scale}px`;
  editor.style.color = target?.fill || state.currentDrawingColor;
  editor.canvasPoint = canvasPoint;
  editor.target = target;
  editor.finish = () => closeNativeTextEditor(true);
  editor.addEventListener('blur', editor.finish, { once: true });
  editor.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeNativeTextEditor(false);
    }
  });
  wrapper.appendChild(editor);
  state.nativeTextEditor = editor;
  editor.focus();
  editor.setSelectionRange(editor.value.length, editor.value.length);
}