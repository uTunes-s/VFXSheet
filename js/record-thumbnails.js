// Thumbnail carousel behavior for record cards.
export function changeRecordThumbnail(button, direction) {
  const container = button.parentElement;
  const images = [...container.querySelectorAll('.record-thumbnail-image')];
  const currentIndex = images.findIndex(image => !image.classList.contains('hidden'));
  const nextIndex = (currentIndex + direction + images.length) % images.length;
  images[currentIndex]?.classList.add('hidden');
  images[nextIndex]?.classList.remove('hidden');
}

Object.assign(globalThis, { changeRecordThumbnail });
