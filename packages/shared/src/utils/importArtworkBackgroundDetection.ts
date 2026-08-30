/**
 * Code-first light-artwork → dark mat recommendation (import Auto path).
 * Prefer false negatives over darkening typical catalog art.
 * Not a halftone detector — display visibility only.
 *
 * Primary: pre-poodle luma-dominant gates (light ink that disappears on Light).
 * Secondary: sparse cream/near-white line art (poodle-class) only.
 */

/** Alpha at or above this counts as opaque for luminance stats. */
export const IMPORT_ARTWORK_BG_OPAQUE_ALPHA_MIN = 250;

/** Relative luminance (0–1) at or above this counts as a “light” opaque pixel (primary). */
export const IMPORT_ARTWORK_BG_LIGHT_LUMA_MIN = 0.85;

/** Minimum opaque sample size before considering dark mat. */
export const IMPORT_ARTWORK_BG_MIN_OPAQUE_PIXELS = 64;

/** Opaque pixels must cover at least this fraction of the sampled canvas (primary). */
export const IMPORT_ARTWORK_BG_MIN_SPARSE_RATIO = 0.015;

/** Fraction of opaque pixels that must be light (primary). */
export const IMPORT_ARTWORK_BG_MIN_LIGHT_OPAQUE_RATIO = 0.9;

/** Mean relative luminance of opaque pixels must be at least this (primary). */
export const IMPORT_ARTWORK_BG_MIN_MEAN_LUMA = 0.88;

/**
 * Cream / near-white floor for secondary sparse line-art path only
 * (below primary 0.85 so cream poodle ink counts as “light”).
 */
export const IMPORT_ARTWORK_BG_CREAM_LUMA_MIN = 0.72;

/** Secondary: fraction of opaque pixels that must be cream/near-white. */
export const IMPORT_ARTWORK_BG_MIN_CREAM_OPAQUE_RATIO = 0.92;

/** Secondary: mean luma lower bound (cream band). */
export const IMPORT_ARTWORK_BG_MIN_CREAM_MEAN_LUMA = 0.78;

/** Secondary: mean luma upper bound — avoid dark/mixed art sneaking in. */
export const IMPORT_ARTWORK_BG_MAX_CREAM_MEAN_LUMA = 0.95;

/**
 * Secondary: max opaque / α-bounding-box occupancy.
 * Dense fills stay Light; sparse strokes may Dark.
 */
export const IMPORT_ARTWORK_BG_MAX_CREAM_BBOX_OCCUPANCY = 0.28;

export interface OpaquePixelLumaStats {
  opaquePixelCount: number;
  /** opaque / (width * height) on the sampled buffer */
  sparseRatio: number;
  /** light opaque / opaque (0 when no opaque pixels); primary light floor */
  lightOpaqueRatio: number;
  /** cream-or-lighter / opaque (secondary floor) */
  creamOpaqueRatio: number;
  /** mean relative luminance of opaque pixels (0 when none) */
  meanLuma: number;
  /**
   * Opaque / visible-artwork bounding-box area.
   * Transparent canvas margins do not inflate this.
   */
  bboxOccupancy: number;
  sampleWidth: number;
  sampleHeight: number;
}

export interface PreferDarkArtworkMatFromPixelStatsInput {
  opaquePixelCount: number;
  lightOpaqueRatio: number;
  meanLuma: number;
  sparseRatio: number;
  creamOpaqueRatio?: number;
  bboxOccupancy?: number;
}

function relativeLuma(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * Aggregate opaque-pixel luminance stats from raw RGBA (or RGB+alpha) bytes.
 */
export function computeOpaquePixelLumaStatsFromRgba(input: {
  data: Uint8Array | Buffer;
  width: number;
  height: number;
  channels: number;
  opaqueAlphaMin?: number;
  lightLumaMin?: number;
  creamLumaMin?: number;
}): OpaquePixelLumaStats {
  const {
    data,
    width,
    height,
    channels,
    opaqueAlphaMin = IMPORT_ARTWORK_BG_OPAQUE_ALPHA_MIN,
    lightLumaMin = IMPORT_ARTWORK_BG_LIGHT_LUMA_MIN,
    creamLumaMin = IMPORT_ARTWORK_BG_CREAM_LUMA_MIN,
  } = input;

  const empty: OpaquePixelLumaStats = {
    opaquePixelCount: 0,
    sparseRatio: 0,
    lightOpaqueRatio: 0,
    creamOpaqueRatio: 0,
    meanLuma: 0,
    bboxOccupancy: 0,
    sampleWidth: width,
    sampleHeight: height,
  };

  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0 ||
    channels < 3
  ) {
    return empty;
  }

  const totalPixels = width * height;
  let opaquePixelCount = 0;
  let lightOpaqueCount = 0;
  let creamOpaqueCount = 0;
  let lumaSum = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * channels;
      const alpha = channels >= 4 ? data[i + 3]! : 255;
      if (alpha < opaqueAlphaMin) {
        continue;
      }

      const luma = relativeLuma(data[i]!, data[i + 1]!, data[i + 2]!);
      opaquePixelCount += 1;
      lumaSum += luma;
      if (luma >= lightLumaMin) {
        lightOpaqueCount += 1;
      }
      if (luma >= creamLumaMin) {
        creamOpaqueCount += 1;
      }
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (opaquePixelCount === 0) {
    return empty;
  }

  const bboxArea = Math.max(1, (maxX - minX + 1) * (maxY - minY + 1));

  return {
    opaquePixelCount,
    sparseRatio: opaquePixelCount / totalPixels,
    lightOpaqueRatio: lightOpaqueCount / opaquePixelCount,
    creamOpaqueRatio: creamOpaqueCount / opaquePixelCount,
    meanLuma: lumaSum / opaquePixelCount,
    bboxOccupancy: opaquePixelCount / bboxArea,
    sampleWidth: width,
    sampleHeight: height,
  };
}

/** Primary pre-poodle gate: clearly light-dominant opaque art. */
export function shouldPreferDarkArtworkMatFromPrimaryLuma(
  input: PreferDarkArtworkMatFromPixelStatsInput,
): boolean {
  const { opaquePixelCount, lightOpaqueRatio, meanLuma, sparseRatio } = input;

  if (
    !Number.isFinite(opaquePixelCount) ||
    !Number.isFinite(lightOpaqueRatio) ||
    !Number.isFinite(meanLuma) ||
    !Number.isFinite(sparseRatio)
  ) {
    return false;
  }

  if (opaquePixelCount < IMPORT_ARTWORK_BG_MIN_OPAQUE_PIXELS) {
    return false;
  }

  if (sparseRatio < IMPORT_ARTWORK_BG_MIN_SPARSE_RATIO) {
    return false;
  }

  if (lightOpaqueRatio < IMPORT_ARTWORK_BG_MIN_LIGHT_OPAQUE_RATIO) {
    return false;
  }

  if (meanLuma < IMPORT_ARTWORK_BG_MIN_MEAN_LUMA) {
    return false;
  }

  return true;
}

/**
 * Secondary: sparse cream/near-white line art (poodle-class).
 * Dense cream fills and mixed-color art stay Light.
 */
export function shouldPreferDarkArtworkMatFromCreamSparseLineArt(
  input: PreferDarkArtworkMatFromPixelStatsInput,
): boolean {
  const {
    opaquePixelCount,
    creamOpaqueRatio = 0,
    meanLuma,
    bboxOccupancy = 1,
  } = input;

  if (
    !Number.isFinite(opaquePixelCount) ||
    !Number.isFinite(creamOpaqueRatio) ||
    !Number.isFinite(meanLuma) ||
    !Number.isFinite(bboxOccupancy)
  ) {
    return false;
  }

  if (opaquePixelCount < IMPORT_ARTWORK_BG_MIN_OPAQUE_PIXELS) {
    return false;
  }

  if (creamOpaqueRatio < IMPORT_ARTWORK_BG_MIN_CREAM_OPAQUE_RATIO) {
    return false;
  }

  if (
    meanLuma < IMPORT_ARTWORK_BG_MIN_CREAM_MEAN_LUMA ||
    meanLuma > IMPORT_ARTWORK_BG_MAX_CREAM_MEAN_LUMA
  ) {
    return false;
  }

  if (bboxOccupancy > IMPORT_ARTWORK_BG_MAX_CREAM_BBOX_OCCUPANCY) {
    return false;
  }

  return true;
}

/**
 * Conservative Dark: primary light-dominant OR secondary sparse cream line art.
 */
export function shouldPreferDarkArtworkMatFromPixelStats(
  input: PreferDarkArtworkMatFromPixelStatsInput,
): boolean {
  if (shouldPreferDarkArtworkMatFromPrimaryLuma(input)) {
    return true;
  }
  return shouldPreferDarkArtworkMatFromCreamSparseLineArt(input);
}

/**
 * Sharp-backed sample + stats for Electron import (and tests with a Sharp factory).
 * Does not import `sharp` — pass Studio/Functions factory. Failures → false.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SharpFactory = any;

const SAMPLE_MAX_SIDE = 400;

export async function suggestDarkArtworkBackgroundFromPngBytes(
  sharp: SharpFactory,
  pngBytes: Uint8Array | Buffer,
): Promise<boolean> {
  const inputBuffer = Buffer.isBuffer(pngBytes) ? pngBytes : Buffer.from(pngBytes);
  let pipeline = sharp(inputBuffer, { failOn: "error" }).ensureAlpha();
  const meta = await sharp(inputBuffer, { failOn: "error" }).metadata();
  const sourceWidth = meta.width ?? 0;
  const sourceHeight = meta.height ?? 0;
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return false;
  }

  const maxSide = Math.max(sourceWidth, sourceHeight);
  if (maxSide > SAMPLE_MAX_SIDE) {
    pipeline = pipeline.resize({
      width: sourceWidth >= sourceHeight ? SAMPLE_MAX_SIDE : undefined,
      height: sourceHeight > sourceWidth ? SAMPLE_MAX_SIDE : undefined,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
  const stats = computeOpaquePixelLumaStatsFromRgba({
    data,
    width: info.width,
    height: info.height,
    channels: info.channels,
  });

  return shouldPreferDarkArtworkMatFromPixelStats(stats);
}
