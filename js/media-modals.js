// Record-preview and image lightbox modal controls.
function closeRecordPreview() {
  document.getElementById('recordPreviewModal').classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
}

function openMediaLightbox(source, alt = 'Expanded preview') {
  const image = document.getElementById('mediaLightboxImage');
  image.src = source;
  image.alt = alt;
  document.getElementById('mediaLightbox').classList.remove('hidden');
  document.getElementById('mediaLightbox').classList.add('flex');
}

function closeMediaLightbox() {
  document.getElementById('mediaLightbox').classList.add('hidden');
  document.getElementById('mediaLightbox').classList.remove('flex');
  document.getElementById('mediaLightboxImage').src = '';
}
