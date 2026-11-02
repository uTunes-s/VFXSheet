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

export function readBlobAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    if (!(blob instanceof Blob) || !blob.size) {
      reject(new Error('Image data is empty or missing. Restore it from a backup or attach the image again.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string'
      ? resolve(reader.result)
      : reject(new Error('Could not read image data. Attach the image again.'));
    reader.onerror = reader.onabort = () => reject(new Error('Could not read image data from local storage. Restore it from a backup or attach the image again.'));
    reader.readAsDataURL(blob);
  });
}

export async function copyImageBlob(blob, label = 'Image') {
  try {
    if (!(blob instanceof Blob) || !blob.size) throw new Error('Empty image');
    // Materialize file-picker bytes instead of persisting an external File backing.
    const bytes = await blob.arrayBuffer();
    if (bytes.byteLength !== blob.size) throw new Error('Incomplete image');
    return new Blob([bytes], { type: blob.type });
  } catch {
    throw new Error(`${label}: Could not read image data. Restore it from a backup or attach the image again.`);
  }
}

export async function imageFromBlob(blob, label = 'Image') {
  if (!blob) return null;
  try {
    // A data URL remains valid for deferred Safari decoding and later canvas draws.
    const source = await readBlobAsDataUrl(blob);
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Could not decode this image. Attach a JPEG or PNG copy, or restore it from a backup.'));
      image.src = source;
    });
  } catch (error) {
    throw new Error(`${label}: ${error.message}`);
  }
}
