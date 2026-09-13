/**
 * Sharp-backed meaningful-transparency measurement shared by Studio import and
 * Functions customer-upload processing. Pass a Sharp factory — this module does
 * not import `sharp` so Portal/browser bundles stay free of native deps.
 *
 * Policy math stays in `assessMeaningfulTransparency` / customerUploadTransparency.ts.
 */

import {
  analyzeTransparencyCanvas,
  assessMeaningfulTransparency,
  CUSTOMER_UPLOAD_TRANSPARENT_ALPHA_MAX,
  type AssessMeaningfulTransparencyResult,
  type CustomerUploadTransparencyFailureCode,
} from "./customerUploadTransparency";

/** Decoder-time pixel bound (matches Functions customer-upload processing). */
export const MEANINGFUL_TRANSPARENCY_DECODE_MAX_INPUT_PIXELS = 0x3fff * 0x3fff;

/** Staff-facing Studio catalog import rejection copy (pass/fail math identical to customer upload). */
export const CATALOG_ARTWORK_REQUIRES_TRANSPARENT_BACKGROUND_MESSAGE =
  "Catalog artwork requires a transparent background. Fully opaque images cannot be imported.";

/**
 * Sharp factory (Studio Electron `loadSharpModule` / Functions `getSharp`).
 * Typed loosely so `@fresh-prints/shared` does not take a hard `sharp` dependency.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SharpFactory = any;

export type MeaningfulTransparencyMeasurement = AssessMeaningfulTransparencyResult & {
  hasAlphaMeta: boolean;
  failureCode?: CustomerUploadTransparencyFailureCode;
};

async function sampleRgbaBuffer(
  sharp: SharpFactory,
  input: Buffer,
  sourceWidth: number,
  sourceHeight: number,
): Promise<{ data: Buffer; width: number; height: number; hasAlpha: boolean }> {
  const maxSide = Math.max(sourceWidth, sourceHeight);
  const sampleMax = 800;
  let pipeline = sharp(input, { failOn: "error" }).ensureAlpha();
  if (maxSide > sampleMax) {
    pipeline = pipeline.resize({
      width: sourceWidth >= sourceHeight ? sampleMax : undefined,
      height: sourceHeight > sourceWidth ? sampleMax : undefined,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
  return {
    data,
    width: info.width,
    height: info.height,
    hasAlpha: info.channels >= 4,
  };
}

/**
 * Assess meaningful transparency from decoded PNG bytes using the shared policy.
 * Uses source `metadata.hasAlpha` (not post-ensureAlpha invention alone).
 */
export async function measureMeaningfulTransparency(
  sharp: SharpFactory,
  sourceBytes: Buffer,
  options?: {
    decodeMaxInputPixels?: number;
    /** When true, skip quality rejection (Functions assisted-proof path only). */
    skipQualityGates?: boolean;
  },
): Promise<MeaningfulTransparencyMeasurement> {
  const decodeMaxInputPixels =
    options?.decodeMaxInputPixels ?? MEANINGFUL_TRANSPARENCY_DECODE_MAX_INPUT_PIXELS;
  const skipQualityGates = options?.skipQualityGates === true;

  let metadata: { hasAlpha?: boolean; width?: number; height?: number };
  try {
    metadata = await sharp(sourceBytes, {
      failOn: "error",
      limitInputPixels: decodeMaxInputPixels,
    }).metadata();
  } catch {
    return {
      passed: false,
      transparentPixelRatio: 0,
      exteriorTransparentRatio: 0,
      hasAlphaMeta: false,
      failureCode: "transparency_check_failed",
    };
  }

  const sourceWidthPx = metadata.width ?? 0;
  const sourceHeightPx = metadata.height ?? 0;
  const hasAlphaMeta = Boolean(metadata.hasAlpha);

  if (!hasAlphaMeta && !skipQualityGates) {
    const failed = assessMeaningfulTransparency({
      hasAlphaChannel: false,
      widthPx: sourceWidthPx,
      heightPx: sourceHeightPx,
      transparentPixelCount: 0,
      exteriorTransparentPixelCount: 0,
      opaqueBoundingBoxCoverageRatio: 1,
    });
    return { ...failed, hasAlphaMeta };
  }

  if (skipQualityGates) {
    return {
      passed: true,
      transparentPixelRatio: 0,
      exteriorTransparentRatio: 0,
      hasAlphaMeta,
    };
  }

  try {
    const sample = await sampleRgbaBuffer(sharp, sourceBytes, sourceWidthPx, sourceHeightPx);
    const analysis = analyzeTransparencyCanvas(
      sample.data,
      sample.width,
      sample.height,
      sample.hasAlpha || hasAlphaMeta,
      CUSTOMER_UPLOAD_TRANSPARENT_ALPHA_MAX,
    );
    const result = assessMeaningfulTransparency({
      ...analysis,
      hasAlphaChannel: analysis.hasAlphaChannel || hasAlphaMeta,
    });
    return { ...result, hasAlphaMeta, failureCode: result.failureCode };
  } catch {
    return {
      passed: false,
      transparentPixelRatio: 0,
      exteriorTransparentRatio: 0,
      hasAlphaMeta,
      failureCode: "transparency_check_failed",
    };
  }
}
