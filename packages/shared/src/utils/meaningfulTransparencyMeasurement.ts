/**
 * Sharp-backed meaningful-transparency measurement shared by Studio import and
 * Functions customer-upload processing. Pass a Sharp factory — this module does
 * not import `sharp` so Portal/browser bundles stay free of native deps.
 *
 * Policy math stays in `assessMeaningfulTransparency` / customerUploadTransparency.ts.
 */

import {
  assessMeaningfulTransparency,
  CUSTOMER_UPLOAD_MIN_TRANSPARENT_PIXEL_RATIO,
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

async function countTransparentPixelsSampled(
  sharp: SharpFactory,
  input: Buffer,
  sourceWidth: number,
  sourceHeight: number,
): Promise<{ hasAlpha: boolean; transparentPixelCount: number; sampleWidth: number; sampleHeight: number }> {
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
  if (info.channels < 4) {
    return {
      hasAlpha: false,
      transparentPixelCount: 0,
      sampleWidth: info.width,
      sampleHeight: info.height,
    };
  }

  const earlyExitCount = Math.ceil(info.width * info.height * CUSTOMER_UPLOAD_MIN_TRANSPARENT_PIXEL_RATIO);
  let transparentPixelCount = 0;
  for (let i = 3; i < data.length; i += info.channels) {
    if (data[i] < CUSTOMER_UPLOAD_TRANSPARENT_ALPHA_MAX) {
      transparentPixelCount += 1;
      if (transparentPixelCount >= earlyExitCount) {
        return {
          hasAlpha: true,
          transparentPixelCount,
          sampleWidth: info.width,
          sampleHeight: info.height,
        };
      }
    }
  }

  return {
    hasAlpha: true,
    transparentPixelCount,
    sampleWidth: info.width,
    sampleHeight: info.height,
  };
}

async function trimTransparentEdgesForProbe(
  sharp: SharpFactory,
  input: Buffer,
  originalWidth: number,
  originalHeight: number,
  decodeMaxInputPixels: number,
): Promise<{
  width: number;
  height: number;
  wasTrimmed: boolean;
  originalWidth: number;
  originalHeight: number;
}> {
  try {
    const { info } = await sharp(input, {
      failOn: "error",
      limitInputPixels: decodeMaxInputPixels,
    })
      .ensureAlpha()
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer({ resolveWithObject: true });

    const width = info.width ?? originalWidth;
    const height = info.height ?? originalHeight;
    const wasTrimmed = width !== originalWidth || height !== originalHeight;

    return {
      width: wasTrimmed ? width : originalWidth,
      height: wasTrimmed ? height : originalHeight,
      wasTrimmed,
      originalWidth,
      originalHeight,
    };
  } catch {
    return {
      width: originalWidth,
      height: originalHeight,
      wasTrimmed: false,
      originalWidth,
      originalHeight,
    };
  }
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
      hasAlphaMeta: false,
      failureCode: "transparency_check_failed",
    };
  }

  const sourceWidthPx = metadata.width ?? 0;
  const sourceHeightPx = metadata.height ?? 0;
  const hasAlphaMeta = Boolean(metadata.hasAlpha);

  let transparency = assessMeaningfulTransparency({
    hasAlphaChannel: hasAlphaMeta,
    widthPx: sourceWidthPx,
    heightPx: sourceHeightPx,
    transparentPixelCount: 0,
  });

  if (hasAlphaMeta && !skipQualityGates) {
    try {
      const sample = await countTransparentPixelsSampled(sharp, sourceBytes, sourceWidthPx, sourceHeightPx);
      transparency = assessMeaningfulTransparency({
        hasAlphaChannel: sample.hasAlpha || hasAlphaMeta,
        widthPx: sample.sampleWidth,
        heightPx: sample.sampleHeight,
        transparentPixelCount: sample.transparentPixelCount,
      });
    } catch {
      return {
        passed: false,
        transparentPixelRatio: 0,
        hasAlphaMeta,
        failureCode: "transparency_check_failed",
      };
    }
  }

  if (!transparency.passed && !skipQualityGates) {
    try {
      const trimmedProbe = await trimTransparentEdgesForProbe(
        sharp,
        sourceBytes,
        sourceWidthPx,
        sourceHeightPx,
        decodeMaxInputPixels,
      );
      const trimShrinkRatioWidth =
        trimmedProbe.originalWidth > 0
          ? (trimmedProbe.originalWidth - trimmedProbe.width) / trimmedProbe.originalWidth
          : 0;
      const trimShrinkRatioHeight =
        trimmedProbe.originalHeight > 0
          ? (trimmedProbe.originalHeight - trimmedProbe.height) / trimmedProbe.originalHeight
          : 0;

      transparency = assessMeaningfulTransparency({
        hasAlphaChannel: hasAlphaMeta || trimmedProbe.wasTrimmed,
        widthPx: sourceWidthPx,
        heightPx: sourceHeightPx,
        transparentPixelCount: 0,
        trimShrinkRatioWidth,
        trimShrinkRatioHeight,
      });
    } catch {
      return {
        passed: false,
        transparentPixelRatio: 0,
        hasAlphaMeta,
        failureCode: "transparency_check_failed",
      };
    }
  }

  if (!transparency.passed && skipQualityGates) {
    return {
      passed: true,
      transparentPixelRatio: transparency.transparentPixelRatio,
      hasAlphaMeta,
    };
  }

  return {
    ...transparency,
    hasAlphaMeta,
    failureCode: transparency.failureCode,
  };
}
