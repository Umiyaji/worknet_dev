const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image"));
    image.src = src;
  });

export const cropImageToDataUrl = async ({
  src,
  zoom = 1,
  offsetX = 0,
  offsetY = 0,
  outputSize = 400,
  type = "image/jpeg",
  quality = 0.92,
}) => {
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas is not supported");
  }

  const baseScale = Math.max(outputSize / image.width, outputSize / image.height);
  const drawWidth = image.width * baseScale * zoom;
  const drawHeight = image.height * baseScale * zoom;
  const drawX = (outputSize - drawWidth) / 2 + offsetX;
  const drawY = (outputSize - drawHeight) / 2 + offsetY;

  context.clearRect(0, 0, outputSize, outputSize);
  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);

  return canvas.toDataURL(type, quality);
};
