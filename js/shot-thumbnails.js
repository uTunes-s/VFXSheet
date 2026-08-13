// Pending shot-thumbnail selection, ordering, and preview rendering.
function addShotThumbnails(event) {
  const files = [...event.target.files];
  if (!files.length) return;
  if (files.some(file => !file.type.startsWith('image/'))) {
    alert('Please select image files only.');
    return;
  }
  pendingShotThumbnails.push(...files);
  markInitialSettingEnabled('shot_thumbnails');
  renderShotThumbnailPreviews();
  event.target.value = '';
}

function renderShotThumbnailPreviews() {
  const preview = document.getElementById('shotThumbnailPreview');
  preview.replaceChildren();
  pendingShotThumbnails.forEach((file, index) => {
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
    remove.onclick = () => {
      pendingShotThumbnails.splice(index, 1);
      renderShotThumbnailPreviews();
    };

    const order = document.createElement('div');
    order.className = 'absolute inset-x-0 bottom-0 flex justify-between bg-slate-950/80 px-0.5';
    const moveLeft = document.createElement('button');
    moveLeft.type = 'button';
    moveLeft.textContent = '←';
    moveLeft.title = 'Move left';
    moveLeft.disabled = index === 0;
    moveLeft.className = 'px-1 text-xs text-amber-300 disabled:opacity-30';
    moveLeft.onclick = () => moveShotThumbnail(index, -1);
    const moveRight = document.createElement('button');
    moveRight.type = 'button';
    moveRight.textContent = '→';
    moveRight.title = 'Move right';
    moveRight.disabled = index === pendingShotThumbnails.length - 1;
    moveRight.className = 'px-1 text-xs text-amber-300 disabled:opacity-30';
    moveRight.onclick = () => moveShotThumbnail(index, 1);
    order.append(moveLeft, moveRight);
    wrapper.append(image, order, remove);
    preview.append(wrapper);
  });
  preview.classList.toggle('hidden', !pendingShotThumbnails.length);
}

function moveShotThumbnail(index, direction) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= pendingShotThumbnails.length) return;
  [pendingShotThumbnails[index], pendingShotThumbnails[nextIndex]] = [pendingShotThumbnails[nextIndex], pendingShotThumbnails[index]];
  renderShotThumbnailPreviews();
}

function clearShotThumbnail() {
  const preview = document.getElementById('shotThumbnailPreview');
  pendingShotThumbnails = [];
  preview.replaceChildren();
  preview.classList.add('hidden');
  document.getElementById('shotThumbnailLibraryInput').value = '';
  document.getElementById('shotThumbnailCameraInput').value = '';
}
