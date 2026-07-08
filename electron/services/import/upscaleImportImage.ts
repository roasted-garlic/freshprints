import { loadSharpModule } from "./loadSharpModule";
import { resolveImportUpscaleTargetPx } from "@fresh-prints/shared/utils/printSizeMath";

export interface UpscaleImportImageResult {
  bytes: Buffer;
  width: number;
  height: number;
  wasUpscaled: boolean;
  originalWidth: number;
  originalHeight: number;
}

/**
 * Upscales a PNG's pixel data (preserving aspect ratio) when its width can't
 * reach the preferred 10in-at-300-DPI print target. Returns the original
 * bytes/dimensions unchanged when no upscale is needed, to avoid needless
 * PNG recompression of already-sufficient images.
 */
export async function upscaleImportImageIfNeeded(
  pngBytes: Buffer,
  pixelWidth: number,
  pixelHeight: number,
): Promise<UpscaleImportImageResult> {
  const target = resolveImportUpscaleTargetPx(pixelWidth, pixelHeight);

  if (!target) {
    return {
      bytes: pngBytes,
      width: pixelWidth,
      height: pixelHeight,
      wasUpscaled: false,
      originalWidth: pixelWidth,
      originalHeight: pixelHeight,
    };
  }

  const sharpApi = await loadSharpModule();
  const upscaledBytes = await sharpApi(pngBytes)
    .resize(target.widthPx, target.heightPx, { fit: "fill", withoutEnlargement: false })
    .png()
    .toBuffer();

  return {
    bytes: upscaledBytes,
    width: target.widthPx,
    height: target.heightPx,
    wasUpscaled: true,
    originalWidth: pixelWidth,
    originalHeight: pixelHeight,
  };
}
