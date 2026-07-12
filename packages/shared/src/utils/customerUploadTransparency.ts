/**
 * Meaningful-transparency assessment for customer artwork (pure / testable).
 * Trusted decode still happens server-side; this evaluates measured alpha stats.
 */

/** Pixels with alpha strictly below this count as transparent. */
export const CUSTOMER_UPLOAD_TRANSPARENT_ALPHA_MAX = 250;

/** Pass when transparent pixels are at least this fraction of the canvas. */
export const CUSTOMER_UPLOAD_MIN_TRANSPARENT_PIXEL_RATIO = 0.005;

/** Pass when lossless transparent-edge trim would shrink either axis by at least this fraction. */
export const CUSTOMER_UPLOAD_MIN_TRIM_SHRINK_RATIO = 0.01;

export type CustomerUploadTransparencyFailureCode =
  | "no_alpha_channel"
  | "background_not_transparent"
  | "invalid_dimensions"
  | "transparency_check_failed";

export interface AssessMeaningfulTransparencyInput {
  hasAlphaChannel: boolean;
  widthPx: number;
  heightPx: number;
  /** Count of pixels with alpha < CUSTOMER_UPLOAD_TRANSPARENT_ALPHA_MAX */
  transparentPixelCount: number;
  /** Optional: fraction of width removed by transparent-edge trim (0–1). */
  trimShrinkRatioWidth?: number;
  /** Optional: fraction of height removed by transparent-edge trim (0–1). */
  trimShrinkRatioHeight?: number;
  /** When true, treat measurement as corrupt / inconclusive and fail closed. */
  measurementFailed?: boolean;
}

export interface AssessMeaningfulTransparencyResult {
  passed: boolean;
  transparentPixelRatio: number;
  failureCode?: CustomerUploadTransparencyFailureCode;
}

function isValidShrink(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

export function assessMeaningfulTransparency(
  input: AssessMeaningfulTransparencyInput,
): AssessMeaningfulTransparencyResult {
  if (input.measurementFailed) {
    return {
      passed: false,
      transparentPixelRatio: 0,
      failureCode: "transparency_check_failed",
    };
  }

  const { widthPx, heightPx, transparentPixelCount, hasAlphaChannel } = input;

  if (
    !Number.isFinite(widthPx) ||
    !Number.isFinite(heightPx) ||
    widthPx <= 0 ||
    heightPx <= 0 ||
    !Number.isFinite(transparentPixelCount) ||
    transparentPixelCount < 0
  ) {
    return {
      passed: false,
      transparentPixelRatio: 0,
      failureCode: "invalid_dimensions",
    };
  }

  const totalPixels = widthPx * heightPx;
  const transparentPixelRatio = Math.min(1, transparentPixelCount / totalPixels);

  if (!hasAlphaChannel) {
    return {
      passed: false,
      transparentPixelRatio,
      failureCode: "no_alpha_channel",
    };
  }

  const trimWidth = isValidShrink(input.trimShrinkRatioWidth)
    ? input.trimShrinkRatioWidth
    : 0;
  const trimHeight = isValidShrink(input.trimShrinkRatioHeight)
    ? input.trimShrinkRatioHeight
    : 0;

  const ratioPass = transparentPixelRatio >= CUSTOMER_UPLOAD_MIN_TRANSPARENT_PIXEL_RATIO;
  const trimPass =
    trimWidth >= CUSTOMER_UPLOAD_MIN_TRIM_SHRINK_RATIO ||
    trimHeight >= CUSTOMER_UPLOAD_MIN_TRIM_SHRINK_RATIO;

  if (ratioPass || trimPass) {
    return { passed: true, transparentPixelRatio };
  }

  return {
    passed: false,
    transparentPixelRatio,
    failureCode: "background_not_transparent",
  };
}
