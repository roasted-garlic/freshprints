import { loadSharpModule } from "./loadSharpModule";
import { MAX_SINGLE_PNG_SIZE_BYTES } from "@fresh-prints/shared/constants/importValidation.constants";

/**
 * Safety margin below the hard ceiling. storage.rules enforces `< 150MB` strictly, so the
 * normalized output targets a slightly smaller budget to absorb encoder variance rather than
 * landing exactly on the boundary.
 */
const TARGET_BYTES = Math.floor(MAX_SINGLE_PNG_SIZE_BYTES * 0.97);

/** Bounded downscale attempts after lossless recompression fails to fit. */
const MAX_DOWNSCALE_ATTEMPTS = 4;

export interface NormalizeImportOutputResult {
  bytes: Buffer;
  width: number;
  height: number;
  wasRecompressed: boolean;
  wasDownscaled: boolean;
  downscaleAttempts: number;
}

export class ImportOutputNormalizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportOutputNormalizationError";
  }
}

/**
 * Computes the next downscale ratio from the achieved-vs-target byte ratio. PNG byte size scales
 * roughly with pixel count, so the linear dimension scales with the square root of the byte ratio.
 * Clamped to a real reduction (and never above 1) so this can only ever shrink, never upscale.
 */
export function resolveDownscaleRatio(currentBytes: number, targetBytes: number): number {
  if (currentBytes <= targetBytes) {
    return 1;
  }

  const ratio = Math.sqrt(targetBytes / currentBytes) * 0.98;
  return Math.min(0.95, Math.max(0.3, ratio));
}

/**
 * Owner QA Amendment 3, Failure 2: a valid large PNG whose processed output exceeds the 150MB
 * upload ceiling was rejected outright. This brings the final output under the ceiling without
 * weakening the ceiling or Storage Rules:
 *
 * 1. Re-encode losslessly at maximum PNG compression (no pixel change, no quality loss).
 * 2. Only if still over budget, proportionally downscale by the minimum needed, bounded to
 *    MAX_DOWNSCALE_ATTEMPTS, preserving aspect ratio and transparency.
 * 3. Never upscale. Never exceed the attempt budget. Surface a real error if it cannot fit.
 *
 * Returns the final pixel dimensions so the caller recalculates stored print size from the actual
 * persisted pixels rather than pre-normalization dimensions.
 */
export async function normalizeImportOutputBytes(
  pngBytes: Buffer,
  pixelWidth: number,
  pixelHeight: number,
): Promise<NormalizeImportOutputResult> {
  if (pngBytes.byteLength <= TARGET_BYTES) {
    return {
      bytes: pngBytes,
      width: pixelWidth,
      height: pixelHeight,
      wasRecompressed: false,
      wasDownscaled: false,
      downscaleAttempts: 0,
    };
  }

  const sharpApi = await loadSharpModule();

  // Step 1: lossless maximum-compression re-encode. Pixels and alpha are untouched.
  let bytes = await sharpApi(pngBytes)
    .png({ compressionLevel: 9, effort: 10 })
    .toBuffer();
  let width = pixelWidth;
  let height = pixelHeight;

  if (bytes.byteLength <= TARGET_BYTES) {
    return {
      bytes,
      width,
      height,
      wasRecompressed: true,
      wasDownscaled: false,
      downscaleAttempts: 0,
    };
  }

  // Step 2: bounded proportional downscale, minimum reduction needed each pass.
  let attempts = 0;

  while (bytes.byteLength > TARGET_BYTES && attempts < MAX_DOWNSCALE_ATTEMPTS) {
    attempts += 1;

    const ratio = resolveDownscaleRatio(bytes.byteLength, TARGET_BYTES);
    const nextWidth = Math.max(1, Math.floor(width * ratio));
    const nextHeight = Math.max(1, Math.floor(height * ratio));

    if (nextWidth >= width && nextHeight >= height) {
      break;
    }

    bytes = await sharpApi(bytes)
      .resize(nextWidth, nextHeight, { fit: "fill" })
      .png({ compressionLevel: 9, effort: 10 })
      .toBuffer();

    const metadata = await sharpApi(bytes).metadata();
    width = metadata.width ?? nextWidth;
    height = metadata.height ?? nextHeight;
  }

  if (bytes.byteLength > TARGET_BYTES) {
    throw new ImportOutputNormalizationError(
      "This image could not be reduced below the maximum upload size without unacceptable quality loss. Reduce the artwork dimensions and try again.",
    );
  }

  return {
    bytes,
    width,
    height,
    wasRecompressed: true,
    wasDownscaled: attempts > 0,
    downscaleAttempts: attempts,
  };
}
