/**
 * Meaningful-transparency assessment for customer artwork (pure / testable).
 * Trusted decode still happens server-side; this evaluates measured alpha stats.
 */

/** Pixels with alpha strictly below this count as transparent. */
export const CUSTOMER_UPLOAD_TRANSPARENT_ALPHA_MAX = 250;

/**
 * Minimum fraction of sampled canvas reachable as edge-connected transparent pixels.
 * Calibrated so thin screenshot borders (~1% margin) fail while real DTF margins pass.
 */
export const CUSTOMER_UPLOAD_EXTERIOR_TRANSPARENT_MIN_RATIO = 0.02;

/**
 * When exterior reach is below this, treat as a thin-border screenshot if the opaque
 * bounding box also covers most of the canvas.
 */
export const CUSTOMER_UPLOAD_THIN_BORDER_MAX_EXTERIOR_RATIO = 0.03;

/** Opaque pixel bbox coverage above this + thin exterior → screenshot-shaped reject. */
export const CUSTOMER_UPLOAD_SCREENSHOT_OPAQUE_BBOX_MIN_RATIO = 0.9;

/**
 * Full-bleed artwork safeguard: allow low exterior reach when enough global transparency
 * exists and opaque content does not dominate the entire canvas.
 */
export const CUSTOMER_UPLOAD_FULL_BLEED_MIN_TRANSPARENT_RATIO = 0.01;

export const CUSTOMER_UPLOAD_FULL_BLEED_MAX_OPAQUE_BBOX_RATIO = 0.92;

/** @deprecated Trim-only pass removed; retained for test migration references only. */
export const CUSTOMER_UPLOAD_MIN_TRANSPARENT_PIXEL_RATIO = 0.005;

/** @deprecated Trim-only pass removed. */
export const CUSTOMER_UPLOAD_MIN_TRIM_SHRINK_RATIO = 0.01;

export type CustomerUploadTransparencyFailureCode =
  | "no_alpha_channel"
  | "background_not_transparent"
  | "invalid_dimensions"
  | "transparency_check_failed";

export interface TransparencyCanvasAnalysis {
  hasAlphaChannel: boolean;
  widthPx: number;
  heightPx: number;
  transparentPixelCount: number;
  exteriorTransparentPixelCount: number;
  opaqueBoundingBoxCoverageRatio: number;
  measurementFailed?: boolean;
}

export interface AssessMeaningfulTransparencyInput extends TransparencyCanvasAnalysis {}

export interface AssessMeaningfulTransparencyResult {
  passed: boolean;
  transparentPixelRatio: number;
  exteriorTransparentRatio: number;
  failureCode?: CustomerUploadTransparencyFailureCode;
}

function isValidDimension(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export function assessMeaningfulTransparency(
  input: AssessMeaningfulTransparencyInput,
): AssessMeaningfulTransparencyResult {
  if (input.measurementFailed) {
    return {
      passed: false,
      transparentPixelRatio: 0,
      exteriorTransparentRatio: 0,
      failureCode: "transparency_check_failed",
    };
  }

  const { widthPx, heightPx, transparentPixelCount, hasAlphaChannel } = input;

  if (
    !isValidDimension(widthPx) ||
    !isValidDimension(heightPx) ||
    !Number.isFinite(transparentPixelCount) ||
    transparentPixelCount < 0 ||
    !Number.isFinite(input.exteriorTransparentPixelCount) ||
    input.exteriorTransparentPixelCount < 0 ||
    !Number.isFinite(input.opaqueBoundingBoxCoverageRatio) ||
    input.opaqueBoundingBoxCoverageRatio < 0 ||
    input.opaqueBoundingBoxCoverageRatio > 1
  ) {
    return {
      passed: false,
      transparentPixelRatio: 0,
      exteriorTransparentRatio: 0,
      failureCode: "invalid_dimensions",
    };
  }

  const totalPixels = widthPx * heightPx;
  const transparentPixelRatio = Math.min(1, transparentPixelCount / totalPixels);
  const exteriorTransparentRatio = Math.min(
    1,
    input.exteriorTransparentPixelCount / totalPixels,
  );

  if (!hasAlphaChannel) {
    return {
      passed: false,
      transparentPixelRatio,
      exteriorTransparentRatio,
      failureCode: "no_alpha_channel",
    };
  }

  if (transparentPixelCount === 0) {
    return {
      passed: false,
      transparentPixelRatio: 0,
      exteriorTransparentRatio: 0,
      failureCode: "background_not_transparent",
    };
  }

  const exteriorPass =
    exteriorTransparentRatio >= CUSTOMER_UPLOAD_EXTERIOR_TRANSPARENT_MIN_RATIO;

  const fullBleedPass =
    transparentPixelRatio >= CUSTOMER_UPLOAD_FULL_BLEED_MIN_TRANSPARENT_RATIO &&
    input.opaqueBoundingBoxCoverageRatio <= CUSTOMER_UPLOAD_FULL_BLEED_MAX_OPAQUE_BBOX_RATIO;

  const thinBorderScreenshot =
    exteriorTransparentRatio < CUSTOMER_UPLOAD_THIN_BORDER_MAX_EXTERIOR_RATIO &&
    input.opaqueBoundingBoxCoverageRatio >= CUSTOMER_UPLOAD_SCREENSHOT_OPAQUE_BBOX_MIN_RATIO;

  if (thinBorderScreenshot) {
    return {
      passed: false,
      transparentPixelRatio,
      exteriorTransparentRatio,
      failureCode: "background_not_transparent",
    };
  }

  if (exteriorPass || fullBleedPass) {
    return {
      passed: true,
      transparentPixelRatio,
      exteriorTransparentRatio,
    };
  }

  return {
    passed: false,
    transparentPixelRatio,
    exteriorTransparentRatio,
    failureCode: "background_not_transparent",
  };
}

/**
 * Analyze alpha samples on a downsampled RGBA buffer (width * height * 4).
 */
export function analyzeTransparencyCanvas(
  data: Buffer,
  widthPx: number,
  heightPx: number,
  hasAlphaChannel: boolean,
  alphaThreshold: number = CUSTOMER_UPLOAD_TRANSPARENT_ALPHA_MAX,
): TransparencyCanvasAnalysis {
  const totalPixels = widthPx * heightPx;

  if (
    !hasAlphaChannel ||
    !isValidDimension(widthPx) ||
    !isValidDimension(heightPx) ||
    data.length < totalPixels * 4
  ) {
    return {
      hasAlphaChannel,
      widthPx,
      heightPx,
      transparentPixelCount: 0,
      exteriorTransparentPixelCount: 0,
      opaqueBoundingBoxCoverageRatio: hasAlphaChannel ? 1 : 0,
    };
  }

  const isTransparent = (x: number, y: number): boolean => {
    const alpha = data[(y * widthPx + x) * 4 + 3];
    return alpha < alphaThreshold;
  };

  let transparentPixelCount = 0;
  let minOpaqueX = widthPx;
  let minOpaqueY = heightPx;
  let maxOpaqueX = -1;
  let maxOpaqueY = -1;

  for (let y = 0; y < heightPx; y += 1) {
    for (let x = 0; x < widthPx; x += 1) {
      if (isTransparent(x, y)) {
        transparentPixelCount += 1;
      } else {
        minOpaqueX = Math.min(minOpaqueX, x);
        minOpaqueY = Math.min(minOpaqueY, y);
        maxOpaqueX = Math.max(maxOpaqueX, x);
        maxOpaqueY = Math.max(maxOpaqueY, y);
      }
    }
  }

  const visited = new Uint8Array(totalPixels);
  const queue: number[] = [];

  const tryEnqueue = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= widthPx || y >= heightPx) {
      return;
    }
    const index = y * widthPx + x;
    if (visited[index] || !isTransparent(x, y)) {
      return;
    }
    visited[index] = 1;
    queue.push(index);
  };

  for (let x = 0; x < widthPx; x += 1) {
    tryEnqueue(x, 0);
    tryEnqueue(x, heightPx - 1);
  }
  for (let y = 0; y < heightPx; y += 1) {
    tryEnqueue(0, y);
    tryEnqueue(widthPx - 1, y);
  }

  let exteriorTransparentPixelCount = 0;
  while (queue.length > 0) {
    const index = queue.pop()!;
    exteriorTransparentPixelCount += 1;
    const x = index % widthPx;
    const y = Math.floor(index / widthPx);
    tryEnqueue(x - 1, y);
    tryEnqueue(x + 1, y);
    tryEnqueue(x, y - 1);
    tryEnqueue(x, y + 1);
  }

  let opaqueBoundingBoxCoverageRatio = 1;
  if (maxOpaqueX >= minOpaqueX && maxOpaqueY >= minOpaqueY) {
    const bboxPixels = (maxOpaqueX - minOpaqueX + 1) * (maxOpaqueY - minOpaqueY + 1);
    opaqueBoundingBoxCoverageRatio = Math.min(1, bboxPixels / totalPixels);
  } else if (transparentPixelCount === totalPixels) {
    opaqueBoundingBoxCoverageRatio = 0;
  }

  return {
    hasAlphaChannel: true,
    widthPx,
    heightPx,
    transparentPixelCount,
    exteriorTransparentPixelCount,
    opaqueBoundingBoxCoverageRatio,
  };
}
