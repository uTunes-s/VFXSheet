// Pending shot-thumbnail selection, ordering, and preview rendering.
import { state } from './state.js';
import { markInitialSettingEnabled } from './initial-settings-ui.js';

export function addShotThumbnails(event) {
  const files = [...event.target.files];
  if (!files.length) return;
  if (files.some(file => !file.type.startsWith('image/'))) {
    alert('Please select image files only.');
    return;
  }
  state.pendingShotThumbnails.push(...files);
  markInitialSettingEnabled('shot_thumbnails');
  renderShotThumbnailPreviews();
  event.target.value = '';
}

export function renderShotThumbnailPreviews() {
  const preview = document.getElementById('shotThumbnailPreview');
  preview.replaceChildren();
  state.pendingShotThumbnails.forEach((file, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'relative';
    const image = document.createElement('img');
    image.src = URL.createObjectURL(file);
    image.alt = `Shot thumbnail ${index + 1}`;
    image.className = 'h-16 w-24 rounded border border-slate-700 object-cover';
    image.onload = () => URL.revokeObjectURL(image.src);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = '×';
    remove.className = 'absolute -right-1 -top-1 h-5 w-5 rounded-full bg-rose-700 text-xs text-white';
    remove.dataset.action = 'remove-shot-thumbnail';
    remove.dataset.thumbnailIndex = index;

    const order = document.createElement('div');
    order.className = 'absolute inset-x-0 bottom-0 flex justify-between bg-slate-950/80 px-0.5';
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
    wrapper.append(image, order, remove);
    preview.append(wrapper);
  });
  preview.classList.toggle('hidden', !state.pendingShotThumbnails.length);
}

export function moveShotThumbnail(index, direction) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= state.pendingShotThumbnails.length) return;
  [state.pendingShotThumbnails[index], state.pendingShotThumbnails[nextIndex]] = [state.pendingShotThumbnails[nextIndex], state.pendingShotThumbnails[index]];
  renderShotThumbnailPreviews();
}

export function clearShotThumbnail() {
  const preview = document.getElementById('shotThumbnailPreview');
  state.pendingShotThumbnails = [];
  preview.replaceChildren();
  preview.classList.add('hidden');
  document.getElementById('shotThumbnailLibraryInput').value = '';
  document.getElementById('shotThumbnailCameraInput').value = '';
}

Object.assign(globalThis, { addShotThumbnails, renderShotThumbnailPreviews, moveShotThumbnail, clearShotThumbnail });
