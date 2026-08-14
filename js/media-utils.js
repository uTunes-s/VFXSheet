// Shared browser download and Blob image utilities.
export function downloadExportBlob(blob, filename) {
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

export async function imageFromBlob(blob) {
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = async () => {
        try {
          // Safari/iPadOS can still lazily decode Blob-backed images after
          // `load`; wait for decoding before the temporary URL is revoked.
          if (typeof image.decode === 'function') await image.decode();
          resolve(image);
        } catch (error) {
          reject(new Error(`Could not decode image data: ${error?.message || 'unknown image decoding error'}`));
        }
      };
      image.onerror = () => reject(new Error('Could not load image data from local storage.'));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
