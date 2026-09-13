import {
  AUTOMATED_UPSCALE_TARGET_WIDTH_INCHES,
  DEFAULT_PRINT_REQUEST_WIDTH_INCHES,
  EXTENDED_UPSCALE_FACTOR_THRESHOLD,
  IMAGE_QUALITY_SIZING_POLICY_VERSION,
  MAX_APPROVED_PRINT_HEIGHT_INCHES,
  MAX_APPROVED_PRINT_WIDTH_INCHES,
  MAX_UPSCALE_FACTOR,
  NEAR_TARGET_TOLERANCE_RATIO,
  PRINT_INCHES_DECIMAL_PLACES,
  TARGET_PRINT_DPI,
} from "../constants/printSize.constants";

export type ImageQualitySizingWarningCode =
  | "TARGET_NOT_REACHED_UPSCALE_CAPPED"
  | "NEAR_TARGET_SKIPPED"
  | "EXTENDED_UPSCALE";

export interface AspectLockedTargetInches {
  /** Aspect-locked automated upscale target width (≤ 12″, height-capped). */
  targetWidthInches: number;
  targetHeightInches: number;
}

export interface ApprovedMaxPrintSize {
  approvedMaxPrintWidthInches: number;
  approvedMaxPrintHeightInches: number;
}

export interface ControlledUpscaleDecision {
  /** Null when no upscale should run. */
  targetWidthPx: number | null;
  targetHeightPx: number | null;
  wasUpscaled: boolean;
  upscalePassCount: 0 | 1;
  upscaleFactor: number;
  sizingWarningCode?: ImageQualitySizingWarningCode;
  /** Native width at 300 DPI before any upscale (trimmed pixels). */
  nativeWidthAt300: number;
  nativeHeightAt300: number;
  aspectLockedTarget: AspectLockedTargetInches;
}

export type PersistedArtworkUpscalePassCount = 0 | 1 | 2;

export interface ImageQualitySizingMetadata extends ApprovedMaxPrintSize {
  wasUpscaled: boolean;
  upscalePassCount: PersistedArtworkUpscalePassCount;
  upscaleFactor: number;
  sizingPolicyVersion: typeof IMAGE_QUALITY_SIZING_POLICY_VERSION;
  sizingWarningCode?: ImageQualitySizingWarningCode;
}

function roundInches(value: number): number {
  const factor = 10 ** PRINT_INCHES_DECIMAL_PLACES;
  return Math.round(value * factor) / factor;
}

function validatePositivePixels(pixelWidth: number, pixelHeight: number): string | null {
  if (!Number.isFinite(pixelWidth) || pixelWidth <= 0) {
    return "Pixel width must be a positive finite number.";
  }
  if (!Number.isFinite(pixelHeight) || pixelHeight <= 0) {
    return "Pixel height must be a positive finite number.";
  }
  return null;
}

/**
 * Aspect-locked target width: start at `defaultWidthInches`, reduce so height
 * does not exceed MAX_APPROVED_PRINT_HEIGHT.
 *
 * For automated production upscale, pass AUTOMATED_UPSCALE_TARGET_WIDTH_INCHES (12).
 * For request defaults, pass DEFAULT_PRINT_REQUEST_WIDTH_INCHES (10).
 */
export function resolveAspectLockedTargetInches(
  pixelWidth: number,
  pixelHeight: number,
  defaultWidthInches: number = AUTOMATED_UPSCALE_TARGET_WIDTH_INCHES,
  maxHeightInches: number = MAX_APPROVED_PRINT_HEIGHT_INCHES,
): AspectLockedTargetInches {
  const pixelError = validatePositivePixels(pixelWidth, pixelHeight);
  if (pixelError) {
    throw new Error(pixelError);
  }

  const aspectHeightPerWidth = pixelHeight / pixelWidth;
  let targetWidthInches = defaultWidthInches;
  let targetHeightInches = targetWidthInches * aspectHeightPerWidth;

  if (targetHeightInches > maxHeightInches) {
    targetWidthInches = maxHeightInches / aspectHeightPerWidth;
    targetHeightInches = maxHeightInches;
  }

  return {
    targetWidthInches,
    targetHeightInches,
  };
}

/**
 * Aspect-locked normal print-request default (10″), height-capped.
 * Distinct from the automated production upscale target.
 */
export function resolveDefaultPrintRequestSizeInches(
  pixelWidth: number,
  pixelHeight: number,
): AspectLockedTargetInches {
  return resolveAspectLockedTargetInches(
    pixelWidth,
    pixelHeight,
    DEFAULT_PRINT_REQUEST_WIDTH_INCHES,
  );
}

/**
 * Approved maximum print size from production pixels at quality DPI,
 * clamped to the 15″ × 16.5″ standard envelope.
 */
export function calculateApprovedMaxPrintSize(
  productionWidthPx: number,
  productionHeightPx: number,
  qualityDpi: number = TARGET_PRINT_DPI,
  maxWidthInches: number = MAX_APPROVED_PRINT_WIDTH_INCHES,
  maxHeightInches: number = MAX_APPROVED_PRINT_HEIGHT_INCHES,
): ApprovedMaxPrintSize {
  const pixelError = validatePositivePixels(productionWidthPx, productionHeightPx);
  if (pixelError) {
    throw new Error(pixelError);
  }
  if (!Number.isFinite(qualityDpi) || qualityDpi <= 0) {
    throw new Error("Quality DPI must be a positive finite number.");
  }

  const qualityWidth = productionWidthPx / qualityDpi;
  const aspectHeightPerWidth = productionHeightPx / productionWidthPx;
  const maxWidthByHeight = maxHeightInches / aspectHeightPerWidth;
  const approvedMaxWidth = Math.min(qualityWidth, maxWidthInches, maxWidthByHeight);
  const approvedMaxHeight = approvedMaxWidth * aspectHeightPerWidth;

  return {
    approvedMaxPrintWidthInches: roundInches(approvedMaxWidth),
    approvedMaxPrintHeightInches: roundInches(approvedMaxHeight),
  };
}

/**
 * Derive approved max lazily for legacy assets that lack persisted policy fields.
 */
export function deriveApprovedMaxPrintSizeFromPixels(
  productionWidthPx: number,
  productionHeightPx: number,
): ApprovedMaxPrintSize | null {
  try {
    return calculateApprovedMaxPrintSize(productionWidthPx, productionHeightPx);
  } catch {
    return null;
  }
}

function resolveUpscaleWarningCode(
  appliedFactor: number,
  capped: boolean,
): ImageQualitySizingWarningCode | undefined {
  if (capped) {
    return "TARGET_NOT_REACHED_UPSCALE_CAPPED";
  }
  if (appliedFactor > EXTENDED_UPSCALE_FACTOR_THRESHOLD + 1e-9) {
    return "EXTENDED_UPSCALE";
  }
  return undefined;
}

/**
 * Single controlled upscale decision for trimmed pixel dimensions.
 * Targets AUTOMATED_UPSCALE_TARGET_WIDTH_INCHES (12″), not the 10″ request default.
 * Never downsamples. At most one pass. Scale factor ≤ MAX_UPSCALE_FACTOR (6).
 * Never upscales past the aspect-locked 12″ production target.
 */
export function resolveControlledUpscale(
  trimmedWidthPx: number,
  trimmedHeightPx: number,
  qualityDpi: number = TARGET_PRINT_DPI,
  maxUpscaleFactor: number = MAX_UPSCALE_FACTOR,
  nearTargetTolerance: number = NEAR_TARGET_TOLERANCE_RATIO,
): ControlledUpscaleDecision {
  const pixelError = validatePositivePixels(trimmedWidthPx, trimmedHeightPx);
  if (pixelError) {
    throw new Error(pixelError);
  }

  const nativeWidthAt300 = trimmedWidthPx / qualityDpi;
  const nativeHeightAt300 = trimmedHeightPx / qualityDpi;
  const aspectLockedTarget = resolveAspectLockedTargetInches(
    trimmedWidthPx,
    trimmedHeightPx,
    AUTOMATED_UPSCALE_TARGET_WIDTH_INCHES,
  );
  const targetWidthPxIdeal = aspectLockedTarget.targetWidthInches * qualityDpi;

  const base: Omit<
    ControlledUpscaleDecision,
    | "targetWidthPx"
    | "targetHeightPx"
    | "wasUpscaled"
    | "upscalePassCount"
    | "upscaleFactor"
    | "sizingWarningCode"
  > = {
    nativeWidthAt300,
    nativeHeightAt300,
    aspectLockedTarget,
  };

  // Already at or above the aspect-locked target — preserve pixels; never downsample.
  if (trimmedWidthPx >= targetWidthPxIdeal) {
    return {
      ...base,
      targetWidthPx: null,
      targetHeightPx: null,
      wasUpscaled: false,
      upscalePassCount: 0,
      upscaleFactor: 1,
    };
  }

  const requiredFactor = targetWidthPxIdeal / trimmedWidthPx;

  // Within near-target tolerance — skip unnecessary resample.
  if (requiredFactor <= 1 + nearTargetTolerance) {
    return {
      ...base,
      targetWidthPx: null,
      targetHeightPx: null,
      wasUpscaled: false,
      upscalePassCount: 0,
      upscaleFactor: 1,
      sizingWarningCode: "NEAR_TARGET_SKIPPED",
    };
  }

  const appliedFactor = Math.min(requiredFactor, maxUpscaleFactor);
  const targetWidthPx = Math.round(trimmedWidthPx * appliedFactor);
  const targetHeightPx = Math.round(trimmedHeightPx * appliedFactor);
  const capped = appliedFactor < requiredFactor - 1e-9;
  const sizingWarningCode = resolveUpscaleWarningCode(appliedFactor, capped);

  // If rounding somehow produced no enlargement, skip.
  if (targetWidthPx <= trimmedWidthPx) {
    return {
      ...base,
      targetWidthPx: null,
      targetHeightPx: null,
      wasUpscaled: false,
      upscalePassCount: 0,
      upscaleFactor: 1,
    };
  }

  return {
    ...base,
    targetWidthPx,
    targetHeightPx,
    wasUpscaled: true,
    upscalePassCount: 1,
    upscaleFactor: roundInches(appliedFactor),
    ...(sizingWarningCode ? { sizingWarningCode } : {}),
  };
}

/**
 * Build persisted sizing metadata after processing (production = post-upscale pixels).
 */
export function buildImageQualitySizingMetadata(
  productionWidthPx: number,
  productionHeightPx: number,
  upscale: Pick<
    ControlledUpscaleDecision,
    "wasUpscaled" | "upscaleFactor" | "sizingWarningCode"
  > & { upscalePassCount: PersistedArtworkUpscalePassCount },
): ImageQualitySizingMetadata {
  const approved = calculateApprovedMaxPrintSize(productionWidthPx, productionHeightPx);
  return {
    ...approved,
    wasUpscaled: upscale.wasUpscaled,
    upscalePassCount: upscale.upscalePassCount,
    upscaleFactor: upscale.upscaleFactor,
    sizingPolicyVersion: IMAGE_QUALITY_SIZING_POLICY_VERSION,
    ...(upscale.sizingWarningCode && upscale.sizingWarningCode !== "NEAR_TARGET_SKIPPED"
      ? { sizingWarningCode: upscale.sizingWarningCode }
      : {}),
  };
}
