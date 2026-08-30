import {
  AUTOMATED_UPSCALE_TARGET_WIDTH_INCHES,
  MAX_UPSCALE_FACTOR,
  NEAR_TARGET_TOLERANCE_RATIO,
  TARGET_PRINT_DPI,
} from "../constants/printSize.constants";
import {
  resolveAspectLockedTargetInches,
  type ImageQualitySizingWarningCode,
} from "./imageQualitySizingPolicy";

export const MAX_SUCCESSFUL_ARTWORK_UPSCALE_PASSES = 2 as const;

export type ArtworkUpscalePassCount = 0 | 1 | 2;

export type ManualArtworkEnhanceStatus =
  | "already_sufficient"
  | "not_eligible"
  | "enhance";

export interface ManualArtworkEnhanceInput {
  currentWidthPx: number;
  currentHeightPx: number;
  upscalePassCount?: ArtworkUpscalePassCount | null;
  upscaleFactor?: number | null;
  nativeSourceWidthPx?: number | null;
  nativeSourceHeightPx?: number | null;
}

export interface ManualArtworkEnhanceDecision {
  status: ManualArtworkEnhanceStatus;
  reason?: string;
  targetWidthPx?: number;
  targetHeightPx?: number;
  appliedFactor?: number;
  cumulativeFactor?: number;
  nextUpscalePassCount?: ArtworkUpscalePassCount;
  sizingWarningCode?: ImageQualitySizingWarningCode;
  nativeSourceWidthPx?: number;
  nativeSourceHeightPx?: number;
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
 * Resolve the preserved native (pre-upscale) production pixel dimensions.
 * Prefer explicit persisted native dimensions; otherwise derive from the last known upscale factor.
 */
export function resolveNativeProductionSourcePixels(input: {
  currentWidthPx: number;
  currentHeightPx: number;
  upscalePassCount?: ArtworkUpscalePassCount | null;
  upscaleFactor?: number | null;
  nativeSourceWidthPx?: number | null;
  nativeSourceHeightPx?: number | null;
}): { widthPx: number; heightPx: number } {
  const pixelError = validatePositivePixels(input.currentWidthPx, input.currentHeightPx);
  if (pixelError) {
    throw new Error(pixelError);
  }

  if (
    typeof input.nativeSourceWidthPx === "number" &&
    input.nativeSourceWidthPx > 0 &&
    typeof input.nativeSourceHeightPx === "number" &&
    input.nativeSourceHeightPx > 0
  ) {
    return {
      widthPx: Math.round(input.nativeSourceWidthPx),
      heightPx: Math.round(input.nativeSourceHeightPx),
    };
  }

  const passCount = input.upscalePassCount ?? 0;
  const factor = input.upscaleFactor ?? 1;
  if (passCount >= 1 && factor > 1 + 1e-9) {
    return {
      widthPx: Math.max(1, Math.round(input.currentWidthPx / factor)),
      heightPx: Math.max(1, Math.round(input.currentHeightPx / factor)),
    };
  }

  return {
    widthPx: Math.round(input.currentWidthPx),
    heightPx: Math.round(input.currentHeightPx),
  };
}

/**
 * Staff-triggered legacy enhancement decision (ADR-FP-080 manual second-pass exception).
 * Enforces cumulative ≤6× from native source and at most one manual pass after automated import.
 */
export function resolveManualArtworkEnhanceDecision(
  input: ManualArtworkEnhanceInput,
): ManualArtworkEnhanceDecision {
  const pixelError = validatePositivePixels(input.currentWidthPx, input.currentHeightPx);
  if (pixelError) {
    throw new Error(pixelError);
  }

  const passCount: ArtworkUpscalePassCount =
    input.upscalePassCount === 0 || input.upscalePassCount === 1 || input.upscalePassCount === 2
      ? input.upscalePassCount
      : 0;

  if (passCount >= MAX_SUCCESSFUL_ARTWORK_UPSCALE_PASSES) {
    return {
      status: "not_eligible",
      reason: "This artwork has already received the maximum allowed enhancement passes.",
    };
  }

  const native = resolveNativeProductionSourcePixels(input);
  const aspectLockedTarget = resolveAspectLockedTargetInches(
    input.currentWidthPx,
    input.currentHeightPx,
    AUTOMATED_UPSCALE_TARGET_WIDTH_INCHES,
  );
  const targetWidthPxIdeal = Math.round(aspectLockedTarget.targetWidthInches * TARGET_PRINT_DPI);
  const maxWidthPxFromNative = Math.round(native.widthPx * MAX_UPSCALE_FACTOR);

  const targetWidthPx = Math.min(targetWidthPxIdeal, maxWidthPxFromNative);

  if (input.currentWidthPx >= targetWidthPx * (1 - NEAR_TARGET_TOLERANCE_RATIO)) {
    return {
      status: "already_sufficient",
      nativeSourceWidthPx: native.widthPx,
      nativeSourceHeightPx: native.heightPx,
    };
  }

  const requiredFactor = targetWidthPx / input.currentWidthPx;
  const maxFactorFromNative = maxWidthPxFromNative / input.currentWidthPx;
  const appliedFactor = Math.min(requiredFactor, maxFactorFromNative);

  if (appliedFactor <= 1 + NEAR_TARGET_TOLERANCE_RATIO) {
    return {
      status: "already_sufficient",
      nativeSourceWidthPx: native.widthPx,
      nativeSourceHeightPx: native.heightPx,
    };
  }

  const nextWidthPx = Math.round(input.currentWidthPx * appliedFactor);
  const nextHeightPx = Math.round(input.currentHeightPx * appliedFactor);
  const cumulativeFactor = nextWidthPx / native.widthPx;

  if (cumulativeFactor > MAX_UPSCALE_FACTOR + 1e-9) {
    return {
      status: "not_eligible",
      reason: "Enhancement would exceed the maximum safe upscale limit for this artwork.",
      nativeSourceWidthPx: native.widthPx,
      nativeSourceHeightPx: native.heightPx,
    };
  }

  if (nextWidthPx <= input.currentWidthPx) {
    return {
      status: "already_sufficient",
      nativeSourceWidthPx: native.widthPx,
      nativeSourceHeightPx: native.heightPx,
    };
  }

  const capped = appliedFactor < requiredFactor - 1e-9;
  const sizingWarningCode: ImageQualitySizingWarningCode | undefined = capped
    ? "TARGET_NOT_REACHED_UPSCALE_CAPPED"
    : appliedFactor > 2 + 1e-9
      ? "EXTENDED_UPSCALE"
      : undefined;

  const nextPassCount = (passCount + 1) as ArtworkUpscalePassCount;

  return {
    status: "enhance",
    targetWidthPx: nextWidthPx,
    targetHeightPx: nextHeightPx,
    appliedFactor,
    cumulativeFactor,
    nextUpscalePassCount: nextPassCount,
    sizingWarningCode,
    nativeSourceWidthPx: native.widthPx,
    nativeSourceHeightPx: native.heightPx,
  };
}

/** Whether Studio should offer the explicit enhance action for sub-optimal DPI. */
export function shouldOfferManualArtworkEnhanceAction(input: {
  effectiveDpi: number;
  enhanceDecision: ManualArtworkEnhanceDecision;
}): boolean {
  if (input.enhanceDecision.status !== "enhance") {
    return false;
  }

  return input.effectiveDpi < 300;
}
