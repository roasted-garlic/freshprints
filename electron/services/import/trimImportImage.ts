import { loadSharpModule } from "./loadSharpModule";

export interface TrimImportImageResult {
  bytes: Buffer;
  width: number;
  height: number;
  wasTrimmed: boolean;
  originalWidth: number;
  originalHeight: number;
}

/**
 * Trims fully-transparent edge padding from a PNG's pixel data. Returns the
 * original bytes/dimensions unchanged when nothing was actually removed, to
 * avoid needless PNG recompression of images with no transparent padding.
 */
export async function trimImportImageIfNeeded(pngBytes: Buffer): Promise<TrimImportImageResult> {
  const sharpApi = await loadSharpModule();
  const originalMetadata = await sharpApi(pngBytes).metadata();
  const originalWidth = originalMetadata.width ?? 0;
  const originalHeight = originalMetadata.height ?? 0;

  const trimmedBytes = await sharpApi(pngBytes)
    .ensureAlpha()
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const trimmedMetadata = await sharpApi(trimmedBytes).metadata();
  const trimmedWidth = trimmedMetadata.width ?? originalWidth;
  const trimmedHeight = trimmedMetadata.height ?? originalHeight;

  const wasTrimmed = trimmedWidth !== originalWidth || trimmedHeight !== originalHeight;

  if (!wasTrimmed) {
    return {
      bytes: pngBytes,
      width: originalWidth,
      height: originalHeight,
      wasTrimmed: false,
      originalWidth,
      originalHeight,
    };
  }

  return {
    bytes: trimmedBytes,
    width: trimmedWidth,
    height: trimmedHeight,
    wasTrimmed: true,
    originalWidth,
    originalHeight,
  };
}
