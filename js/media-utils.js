// Shared browser download and Blob image utilities.
function downloadExportBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Safari can cancel downloads if the Object URL is revoked in the same task.
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

async function imageFromBlob(blob) {
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
