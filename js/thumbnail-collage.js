// Creates an uncropped, near-16:9 JPEG collage from shot thumbnails.
async function createThumbnailCollage(thumbnailBlobs) {
  const images = (await Promise.all(thumbnailBlobs.map(imageFromBlob))).filter(Boolean);
  if (!images.length) return null;

  const targetAspectRatio = 16 / 9;
  const collageWidth = 1600;
  const imageAspects = images.map(image => image.width / image.height);
  // Keep the saved order and group adjacent images into rows with similar
  // total aspect ratios. This produces an overall collage close to 16:9
  // while every source image remains fully visible and uncropped.
  const totalAspect = imageAspects.reduce((total, aspect) => total + aspect, 0);
  const idealRowCount = Math.sqrt(totalAspect / targetAspectRatio);
  const rowCountCandidates = [...new Set([Math.floor(idealRowCount), Math.ceil(idealRowCount)].map(count => Math.min(images.length, Math.max(1, count))))];
  const rowCount = rowCountCandidates.reduce((best, candidate) =>
    Math.abs(totalAspect / (candidate * candidate) - targetAspectRatio) < Math.abs(totalAspect / (best * best) - targetAspectRatio) ? candidate : best
  );
  const targetRowAspect = totalAspect / rowCount;
  const rows = [];
  let currentRow = [];
  let currentAspect = 0;
  imageAspects.forEach((aspect, index) => {
    const rowsRemaining = rowCount - rows.length;
    const imagesRemaining = images.length - index;
    const shouldStartNextRow = currentRow.length > 0
      && rowsRemaining > 1
      && imagesRemaining > rowsRemaining - 1
      && Math.abs(currentAspect - targetRowAspect) < Math.abs(currentAspect + aspect - targetRowAspect);
    if (shouldStartNextRow) {
      rows.push(currentRow);
      currentRow = [];
      currentAspect = 0;
    }
    currentRow.push({ image: images[index], aspect });
    currentAspect += aspect;
  });
  if (currentRow.length) rows.push(currentRow);

  const rowLayouts = rows.map(row => {
    const aspect = row.reduce((total, item) => total + item.aspect, 0);
    return { items: row, height: Math.max(1, Math.round(collageWidth / aspect)) };
  });
  const canvas = document.createElement('canvas');
  canvas.width = collageWidth;
  canvas.height = rowLayouts.reduce((height, row) => height + row.height, 0);
  const context = canvas.getContext('2d');

  let y = 0;
  rowLayouts.forEach(({ items, height }) => {
    let x = 0;
    items.forEach(({ image, aspect }, index) => {
      // Rounding is assigned to the final image so every row reaches the
      // canvas edge without altering source aspect ratios or cropping.
      const width = index === items.length - 1 ? collageWidth - x : Math.round(height * aspect);
      context.drawImage(image, x, y, width, height);
      x += width;
    });
    y += height;
  });

  return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
}
