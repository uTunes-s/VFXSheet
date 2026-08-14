// Thumbnail carousel behavior for record cards.
export function changeRecordThumbnail(button, direction) {
  const container = button.parentElement;
  const images = [...container.querySelectorAll('.record-thumbnail-image')];
  const currentIndex = images.findIndex(image => !image.classList.contains('hidden'));
  const nextIndex = currentIndex + direction;
  if (nextIndex < 0 || nextIndex >= images.length) return;
  images[currentIndex]?.classList.add('hidden');
  images[nextIndex]?.classList.remove('hidden');

  const previous = container.querySelector('.record-thumbnail-previous');
  const next = container.querySelector('.record-thumbnail-next');
  previous?.classList.toggle('invisible', nextIndex === 0);
  next?.classList.toggle('invisible', nextIndex === images.length - 1);
}

