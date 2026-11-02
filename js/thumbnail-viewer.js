// Non-modal reference images stay available while the record form is edited.
import { state } from './state.js';
import { imageFromBlob } from './media-utils.js';

let index = 0;
let zoom = 1;
let generation = 0;

const panel = () => document.getElementById('floatingThumbnailViewer');
const viewport = () => {
  const view = window.visualViewport;
  return { left: view?.offsetLeft || 0, top: view?.offsetTop || 0, width: view?.width || window.innerWidth, height: view?.height || window.innerHeight };
};

function fitToViewport() {
  const element = panel();
  if (!element || element.hidden) return;
  const view = viewport();
  const rect = element.getBoundingClientRect();
  const width = Math.min(Math.max(240, rect.width), view.width - 16);
  const height = Math.min(Math.max(180, rect.height), view.height - 16);
  element.style.width = `${width}px`;
  if (!element.classList.contains('is-minimized')) element.style.height = `${height}px`;
  const visibleHeight = element.classList.contains('is-minimized') ? element.getBoundingClientRect().height : height;
  element.style.left = `${Math.max(view.left + 8, Math.min(rect.left, view.left + view.width - width - 8))}px`;
  element.style.top = `${Math.max(view.top + 8, Math.min(rect.top, view.top + view.height - visibleHeight - 8))}px`;
}

function applyZoom() {
  const surface = document.getElementById('floatingThumbnailSurface');
  surface.style.width = `${zoom * 100}%`;
  surface.style.height = `${zoom * 100}%`;
  document.getElementById('floatingThumbnailZoom').textContent = `${Math.round(zoom * 100)}%`;
}

export async function refreshFloatingThumbnailViewer() {
  const element = panel();
  if (!element || element.hidden) return;
  if (!state.pendingShotThumbnails.length) return closeFloatingThumbnailViewer();
  index = Math.min(index, state.pendingShotThumbnails.length - 1);
  const current = ++generation;
  const image = document.getElementById('floatingThumbnailImage');
  const status = document.getElementById('floatingThumbnailStatus');
  image.removeAttribute('src');
  status.textContent = 'Loading image...';
  document.getElementById('floatingThumbnailCount').textContent = `${index + 1} / ${state.pendingShotThumbnails.length}`;
  element.querySelector('[data-viewer-action="previous"]').disabled = index === 0;
  element.querySelector('[data-viewer-action="next"]').disabled = index === state.pendingShotThumbnails.length - 1;
  try {
    const loaded = await imageFromBlob(state.pendingShotThumbnails[index], `Thumbnail ${index + 1}`);
    if (current !== generation) return;
    image.src = loaded.src;
    image.alt = `Reference thumbnail ${index + 1}`;
    status.textContent = '';
  } catch (error) {
    if (current === generation) status.textContent = error.message;
  }
}

export function openFloatingThumbnailViewer(thumbnailIndex) {
  if (!state.pendingShotThumbnails[thumbnailIndex]) return;
  const element = panel();
  if (element.hidden) {
    const view = viewport();
    const width = Math.min(480, view.width - 16);
    const height = Math.min(360, view.height - 16);
    Object.assign(element.style, {
      width: `${width}px`, height: `${height}px`,
      left: `${view.left + view.width - width - 8}px`, top: `${view.top + 72}px`
    });
  }
  element.hidden = false;
  element.classList.remove('is-minimized');
  element.querySelector('[data-viewer-action="minimize"]').setAttribute('aria-expanded', 'true');
  index = thumbnailIndex;
  zoom = 1;
  applyZoom();
  fitToViewport();
  refreshFloatingThumbnailViewer();
}

export function closeFloatingThumbnailViewer() {
  ++generation;
  const element = panel();
  if (!element) return;
  element.hidden = true;
  document.getElementById('floatingThumbnailImage').removeAttribute('src');
}

export function initFloatingThumbnailViewer() {
  const element = panel();
  element.addEventListener('click', event => {
    const action = event.target.closest('[data-viewer-action]')?.dataset.viewerAction;
    if (!action) return;
    if (action === 'close') return closeFloatingThumbnailViewer();
    if (action === 'minimize') {
      const minimized = element.classList.toggle('is-minimized');
      event.target.closest('button').setAttribute('aria-expanded', String(!minimized));
      fitToViewport();
      return;
    }
    if (action === 'previous' || action === 'next') {
      const next = index + (action === 'previous' ? -1 : 1);
      if (next < 0 || next >= state.pendingShotThumbnails.length) return;
      index = next;
      zoom = 1;
      refreshFloatingThumbnailViewer();
    } else zoom = action === 'reset' ? 1 : Math.max(1, Math.min(4, zoom + (action === 'zoom-in' ? 0.25 : -0.25)));
    applyZoom();
  });
  element.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeFloatingThumbnailViewer();
  });
  let gesture = null;
  element.addEventListener('pointerdown', event => {
    const handle = event.target.closest('[data-viewer-drag], [data-viewer-resize]');
    if (!handle || event.target.closest('button') || event.button !== 0 || !event.isPrimary) return;
    const rect = element.getBoundingClientRect();
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, width: rect.width, height: rect.height, resize: handle.hasAttribute('data-viewer-resize') };
    handle.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  element.addEventListener('pointermove', event => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (gesture.resize) {
      element.style.width = `${Math.max(240, gesture.width + dx)}px`;
      element.style.height = `${Math.max(180, gesture.height + dy)}px`;
    } else {
      element.style.left = `${gesture.left + dx}px`;
      element.style.top = `${gesture.top + dy}px`;
    }
    fitToViewport();
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => element.addEventListener(type, () => { gesture = null; }));
  window.addEventListener('resize', fitToViewport);
  window.visualViewport?.addEventListener('resize', fitToViewport);
  window.visualViewport?.addEventListener('scroll', fitToViewport);
}
