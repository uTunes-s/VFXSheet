// Pending shot-thumbnail selection, ordering, and preview rendering.
import { state } from './state.js';
import { markInitialSettingEnabled } from './initial-settings-ui.js';
import { copyImageBlob, imageFromBlob } from './media-utils.js';
import { refreshFloatingThumbnailViewer } from './thumbnail-viewer.js';

let previewGeneration = 0;

export async function addShotThumbnails(event) {
  const files = [...event.target.files];
  const session = state.editorSession;
  const selectionVersion = state.thumbnailSelectionVersion;
  event.target.value = '';
  if (!files.length) return;
  if (files.some(file => !file.type.startsWith('image/'))) {
    alert('Please select image files only.');
    return;
  }
  state.pendingThumbnailLoads++;
  try {
    const images = await Promise.all(files.map(async (file, index) => {
      const blob = await copyImageBlob(file, `Thumbnail ${index + 1}`);
      await imageFromBlob(blob, `Thumbnail ${index + 1}`);
      return blob;
    }));
    if (session !== state.editorSession || selectionVersion !== state.thumbnailSelectionVersion) return;
    state.pendingShotThumbnails.push(...images);
    state.isEditorDirty = true;
    markInitialSettingEnabled('shot_thumbnails');
    renderShotThumbnailPreviews();
  } catch (error) {
    if (session === state.editorSession) alert(error.message);
  } finally {
    if (session === state.editorSession) state.pendingThumbnailLoads--;
  }
}

export function renderShotThumbnailPreviews() {
  const generation = ++previewGeneration;
  const preview = document.getElementById('shotThumbnailPreview');
  preview.replaceChildren();
  state.pendingShotThumbnails.forEach((file, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'relative';
    const open = document.createElement('button');
    open.type = 'button';
    open.dataset.action = 'open-floating-thumbnail';
    open.dataset.thumbnailIndex = index;
    open.setAttribute('aria-label', `Open thumbnail ${index + 1} in floating viewer`);
    const image = document.createElement('img');
    image.alt = `Shot thumbnail ${index + 1}`;
    image.className = 'h-9 w-12 rounded border border-slate-700 object-cover';
    imageFromBlob(file, `Thumbnail ${index + 1}`).then(loaded => {
      if (generation === previewGeneration) image.src = loaded.src;
    }).catch(error => {
      if (generation === previewGeneration) {
        image.alt = `Thumbnail ${index + 1}: unavailable`;
        open.title = error.message;
      }
    });
    open.append(image);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = '×';
    remove.className = 'absolute -right-1 -top-1 h-5 w-5 rounded-full bg-rose-700 text-xs text-white';
    remove.dataset.action = 'remove-shot-thumbnail';
    remove.dataset.thumbnailIndex = index;

    const order = document.createElement('div');
    order.className = 'flex justify-between bg-slate-950/80 px-0.5';
    const moveLeft = document.createElement('button');
    moveLeft.type = 'button';
    moveLeft.textContent = '←';
    moveLeft.title = 'Move left';
    moveLeft.disabled = index === 0;
    moveLeft.className = 'px-1 text-xs text-amber-300 disabled:opacity-30';
    moveLeft.dataset.action = 'move-shot-thumbnail';
    moveLeft.dataset.thumbnailIndex = index;
    moveLeft.dataset.direction = '-1';
    const moveRight = document.createElement('button');
    moveRight.type = 'button';
    moveRight.textContent = '→';
    moveRight.title = 'Move right';
    moveRight.disabled = index === state.pendingShotThumbnails.length - 1;
    moveRight.className = 'px-1 text-xs text-amber-300 disabled:opacity-30';
    moveRight.dataset.action = 'move-shot-thumbnail';
    moveRight.dataset.thumbnailIndex = index;
    moveRight.dataset.direction = '1';
    order.append(moveLeft, moveRight);
    wrapper.append(open, order, remove);
    preview.append(wrapper);
  });
  preview.classList.toggle('hidden', !state.pendingShotThumbnails.length);
  document.getElementById('shotThumbnailClearBtn')?.classList.toggle('hidden', !state.pendingShotThumbnails.length);
  refreshFloatingThumbnailViewer();
}

export function moveShotThumbnail(index, direction) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= state.pendingShotThumbnails.length) return;
  [state.pendingShotThumbnails[index], state.pendingShotThumbnails[nextIndex]] = [state.pendingShotThumbnails[nextIndex], state.pendingShotThumbnails[index]];
  renderShotThumbnailPreviews();
  state.isEditorDirty = true;
}

export function clearShotThumbnail() {
  ++previewGeneration;
  state.thumbnailSelectionVersion++;
  const preview = document.getElementById('shotThumbnailPreview');
  state.pendingShotThumbnails = [];
  preview.replaceChildren();
  preview.classList.add('hidden');
  document.getElementById('shotThumbnailClearBtn')?.classList.add('hidden');
  document.getElementById('shotThumbnailLibraryInput').value = '';
  document.getElementById('shotThumbnailCameraInput').value = '';
  refreshFloatingThumbnailViewer();
}
