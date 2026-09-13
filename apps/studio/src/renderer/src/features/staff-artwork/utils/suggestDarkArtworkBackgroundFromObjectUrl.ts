import {
  computeOpaquePixelLumaStatsFromRgba,
  shouldPreferDarkArtworkMatFromPixelStats,
} from "@fresh-prints/shared/utils/importArtworkBackgroundDetection";

const SAMPLE_MAX_SIDE = 512;

/**
 * Browser-side dark-mat suggestion for Staff Artwork upload previews.
 * Mirrors import Auto detection without requiring Sharp/Electron IPC.
 */
export async function suggestDarkArtworkBackgroundFromObjectUrl(
  objectUrl: string,
): Promise<boolean> {
  const image = await loadImage(objectUrl);
  const { canvas, width, height } = drawSampledImage(image);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context || width <= 0 || height <= 0) {
    return false;
  }
  const imageData = context.getImageData(0, 0, width, height);
  const stats = computeOpaquePixelLumaStatsFromRgba({
    data: imageData.data,
    width,
    height,
    channels: 4,
  });
  return shouldPreferDarkArtworkMatFromPixelStats(stats);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load image for background detection."));
    image.src = src;
  });
}

function drawSampledImage(image: HTMLImageElement): {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
} {
  const sourceWidth = Math.max(1, image.naturalWidth || image.width);
  const sourceHeight = Math.max(1, image.naturalHeight || image.height);
  const maxSide = Math.max(sourceWidth, sourceHeight);
  const scale = maxSide > SAMPLE_MAX_SIDE ? SAMPLE_MAX_SIDE / maxSide : 1;
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    return { canvas, width: 0, height: 0 };
  }
  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return { canvas, width, height };
}
