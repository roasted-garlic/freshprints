import {
  artworkBackgroundHexToRgb,
} from "../../../packages/shared/src/constants/design/artworkBackground.constants";
import { getSharp } from "./lazySharp";

/** Facebook large link preview target (≈1.91:1). */
export const PORTAL_OG_CANVAS_WIDTH = 1200;
export const PORTAL_OG_CANVAS_HEIGHT = 630;

/** Align with other Functions image helpers — reject pathological inputs. */
export const PORTAL_OG_MAX_INPUT_PIXELS = 40_000_000;
export const PORTAL_OG_MAX_INPUT_BYTES = 25 * 1024 * 1024;

export interface PortalOgLetterboxImage {
  bytes: Buffer;
  contentType: "image/jpeg";
  width: number;
  height: number;
}

/**
 * Fit artwork into a 1200×630 canvas with contain + centered letterbox/pillarbox.
 * `backgroundHex` is validated/normalized; invalid/missing → Portal artwork grey.
 */
export async function composePortalOgLetterboxImage(
  inputBytes: Buffer,
  backgroundHex?: unknown,
): Promise<PortalOgLetterboxImage> {
  if (inputBytes.byteLength === 0 || inputBytes.byteLength > PORTAL_OG_MAX_INPUT_BYTES) {
    throw new Error("og_image_input_size");
  }

  const rgb = artworkBackgroundHexToRgb(backgroundHex);
  const background = { r: rgb.r, g: rgb.g, b: rgb.b, alpha: 1 };

  const sharp = getSharp();
  const bytes = await sharp(inputBytes, {
    failOn: "none",
    limitInputPixels: PORTAL_OG_MAX_INPUT_PIXELS,
  })
    .rotate()
    .resize({
      width: PORTAL_OG_CANVAS_WIDTH,
      height: PORTAL_OG_CANVAS_HEIGHT,
      fit: "contain",
      background,
    })
    .flatten({ background })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();

  return {
    bytes,
    contentType: "image/jpeg",
    width: PORTAL_OG_CANVAS_WIDTH,
    height: PORTAL_OG_CANVAS_HEIGHT,
  };
}
