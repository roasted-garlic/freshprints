import {
  MAX_UPSCALE_FACTOR,
  NEAR_TARGET_TOLERANCE_RATIO,
  TARGET_PRINT_DPI,
} from "../constants/printSize.constants";
import { calculateEffectiveDpi } from "./printSizeMath";
import {
  resolveNativeProductionSourcePixels,
  type ArtworkUpscalePassCount,
} from "./manualArtworkEnhance";

export type ArtworkEnhanceMode = "baseline" | "enhanced";

export type InteractiveUpscaleToggleState =
  | "available"
  | "generated"
  | "maximum_resolution"
  | "sufficient_capacity_remains";

export interface InteractiveUpscaleAssetPixels {
  currentWidthPx: number;
  currentHeightPx: number;
  upscalePassCount?: ArtworkUpscalePassCount | null;
  upscaleFactor?: number | null;
  nativeSourceWidthPx?: number | null;
  nativeSourceHeightPx?: number | null;
  interactiveEnhanceGeneratedAt?: unknown;
  enhancedWidthPx?: number | null;
  enhancedHeightPx?: number | null;
}

export interface InteractiveUpscaleCapacity {
  nativeWidthPx: number;
  nativeHeightPx: number;
  baselineWidthPx: number;
  baselineHeightPx: number;
  maxAllowedWidthPx: number;
  maxAllowedHeightPx: number;
  isAtMaximumResolution: boolean;
  hasInteractiveDerivative: boolean;
}

export interface InteractiveEnhanceTargetInput {
  baselineWidthPx: number;
  baselineHeightPx: number;
  nativeWidthPx: number;
  nativeHeightPx: number;
  printWidthInches: number;
  printHeightInches: number;
}

export interface InteractiveEnhanceTargetResult {
  targetWidthPx: number;
  targetHeightPx: number;
  appliedFactor: number;
  cumulativeFactor: number;
  cappedByNativeMax: boolean;
}

export interface InteractiveUpscaleToggleEligibilityInput {
  asset: InteractiveUpscaleAssetPixels;
  printWidthInches: number;
  printHeightInches: number;
  artworkEnhanceMode?: ArtworkEnhanceMode | null;
}

export interface InteractiveUpscaleToggleEligibility {
  state: InteractiveUpscaleToggleState;
  toggleEnabled: boolean;
  helperText?: string;
  capacity: InteractiveUpscaleCapacity;
  enhanceTarget?: InteractiveEnhanceTargetResult;
}

export function resolveArtworkEnhanceMode(
  mode: ArtworkEnhanceMode | null | undefined,
): ArtworkEnhanceMode {
  return mode === "enhanced" ? "enhanced" : "baseline";
}

export function hasInteractiveArtworkDerivative(asset: InteractiveUpscaleAssetPixels): boolean {
  return asset.interactiveEnhanceGeneratedAt != null;
}

function validatePositivePixels(widthPx: number, heightPx: number): void {
  if (!Number.isFinite(widthPx) || widthPx <= 0 || !Number.isFinite(heightPx) || heightPx <= 0) {
    throw new Error("Pixel dimensions must be positive finite numbers.");
  }
}

function validatePositiveInches(widthInches: number, heightInches: number): void {
  if (!Number.isFinite(widthInches) || widthInches <= 0) {
    throw new Error("Print width must be a positive finite number.");
  }
  if (!Number.isFinite(heightInches) || heightInches <= 0) {
    throw new Error("Print height must be a positive finite number.");
  }
}

function resolveCumulativeFactor(
  widthPx: number,
  heightPx: number,
  nativeWidthPx: number,
  nativeHeightPx: number,
): number {
  return Math.max(widthPx / nativeWidthPx, heightPx / nativeHeightPx);
}

export function resolveBaselineEffectiveDpiAtPrintSize(
  baselineWidthPx: number,
  baselineHeightPx: number,
  printWidthInches: number,
  printHeightInches: number,
): number | null {
  const dpiAtBaseline = calculateEffectiveDpi(
    baselineWidthPx,
    baselineHeightPx,
    printWidthInches,
    printHeightInches,
    true,
  );
  return dpiAtBaseline.success ? dpiAtBaseline.effectiveDpi : null;
}

/**
 * First-time generation offer only (~300 DPI target vs hard 200 DPI save floor).
 * Not used when an interactive derivative already exists (selection-only path).
 */
export function isInteractiveUpscaleGenerationOfferedAtPrintSize(
  baselineWidthPx: number,
  baselineHeightPx: number,
  printWidthInches: number,
  printHeightInches: number,
): boolean {
  const effectiveDpi = resolveBaselineEffectiveDpiAtPrintSize(
    baselineWidthPx,
    baselineHeightPx,
    printWidthInches,
    printHeightInches,
  );
  if (effectiveDpi === null) {
    return false;
  }

  return effectiveDpi < TARGET_PRINT_DPI * (1 - NEAR_TARGET_TOLERANCE_RATIO);
}

/** @deprecated Use isInteractiveUpscaleGenerationOfferedAtPrintSize */
export function isInteractiveUpscaleOfferedAtPrintSize(
  baselineWidthPx: number,
  baselineHeightPx: number,
  printWidthInches: number,
  printHeightInches: number,
): boolean {
  return isInteractiveUpscaleGenerationOfferedAtPrintSize(
    baselineWidthPx,
    baselineHeightPx,
    printWidthInches,
    printHeightInches,
  );
}

export function resolveInteractiveUpscaleCapacity(
  asset: InteractiveUpscaleAssetPixels,
): InteractiveUpscaleCapacity {
  validatePositivePixels(asset.currentWidthPx, asset.currentHeightPx);
  const native = resolveNativeProductionSourcePixels(asset);
  const maxAllowedWidthPx = Math.round(native.widthPx * MAX_UPSCALE_FACTOR);
  const maxAllowedHeightPx = Math.round(native.heightPx * MAX_UPSCALE_FACTOR);
  const baselineWidthPx = Math.round(asset.currentWidthPx);
  const baselineHeightPx = Math.round(asset.currentHeightPx);
  const baselineCumulative = resolveCumulativeFactor(
    baselineWidthPx,
    baselineHeightPx,
    native.widthPx,
    native.heightPx,
  );
  const isAtMaximumResolution =
    baselineCumulative >= MAX_UPSCALE_FACTOR * (1 - NEAR_TARGET_TOLERANCE_RATIO);

  return {
    nativeWidthPx: native.widthPx,
    nativeHeightPx: native.heightPx,
    baselineWidthPx,
    baselineHeightPx,
    maxAllowedWidthPx,
    maxAllowedHeightPx,
    isAtMaximumResolution,
    hasInteractiveDerivative: hasInteractiveArtworkDerivative(asset),
  };
}

/**
 * Request-driven interactive upscale target (~300 effective DPI at selected print size),
 * capped by cumulative native × MAX_UPSCALE_FACTOR.
 */
export function resolveInteractiveEnhanceTargetPixels(
  input: InteractiveEnhanceTargetInput,
): InteractiveEnhanceTargetResult | null {
  validatePositivePixels(input.baselineWidthPx, input.baselineHeightPx);
  validatePositivePixels(input.nativeWidthPx, input.nativeHeightPx);
  validatePositiveInches(input.printWidthInches, input.printHeightInches);

  const dpiAtBaseline = calculateEffectiveDpi(
    input.baselineWidthPx,
    input.baselineHeightPx,
    input.printWidthInches,
    input.printHeightInches,
    true,
  );
  if (!dpiAtBaseline.success) {
    return null;
  }

  if (dpiAtBaseline.effectiveDpi >= TARGET_PRINT_DPI * (1 - NEAR_TARGET_TOLERANCE_RATIO)) {
    const headroomScale = MAX_UPSCALE_FACTOR / resolveCumulativeFactor(
      input.baselineWidthPx,
      input.baselineHeightPx,
      input.nativeWidthPx,
      input.nativeHeightPx,
    );
    if (headroomScale <= 1 + NEAR_TARGET_TOLERANCE_RATIO) {
      return null;
    }
  }

  const idealWidthPx = Math.round(input.printWidthInches * TARGET_PRINT_DPI);
  const idealHeightPx = Math.round(input.printHeightInches * TARGET_PRINT_DPI);
  const scaleForWidth = idealWidthPx / input.baselineWidthPx;
  const scaleForHeight = idealHeightPx / input.baselineHeightPx;
  const requiredScale = Math.max(scaleForWidth, scaleForHeight);

  if (requiredScale <= 1 + NEAR_TARGET_TOLERANCE_RATIO) {
    return null;
  }

  let targetWidthPx = Math.round(input.baselineWidthPx * requiredScale);
  let targetHeightPx = Math.round(input.baselineHeightPx * requiredScale);

  const cumulativeWidth = targetWidthPx / input.nativeWidthPx;
  const cumulativeHeight = targetHeightPx / input.nativeHeightPx;
  const cumulativeFactor = Math.max(cumulativeWidth, cumulativeHeight);
  let cappedByNativeMax = false;

  if (cumulativeFactor > MAX_UPSCALE_FACTOR + 1e-9) {
    const capScale = MAX_UPSCALE_FACTOR / resolveCumulativeFactor(
      input.baselineWidthPx,
      input.baselineHeightPx,
      input.nativeWidthPx,
      input.nativeHeightPx,
    );
    if (capScale <= 1 + NEAR_TARGET_TOLERANCE_RATIO) {
      return null;
    }
    targetWidthPx = Math.round(input.baselineWidthPx * capScale);
    targetHeightPx = Math.round(input.baselineHeightPx * capScale);
    cappedByNativeMax = true;
  }

  if (
    targetWidthPx <= input.baselineWidthPx * (1 + NEAR_TARGET_TOLERANCE_RATIO) &&
    targetHeightPx <= input.baselineHeightPx * (1 + NEAR_TARGET_TOLERANCE_RATIO)
  ) {
    return null;
  }

  const appliedFactor = Math.max(targetWidthPx / input.baselineWidthPx, targetHeightPx / input.baselineHeightPx);
  const finalCumulative = resolveCumulativeFactor(
    targetWidthPx,
    targetHeightPx,
    input.nativeWidthPx,
    input.nativeHeightPx,
  );

  return {
    targetWidthPx,
    targetHeightPx,
    appliedFactor,
    cumulativeFactor: finalCumulative,
    cappedByNativeMax,
  };
}

export function resolveInteractiveUpscaleToggleEligibility(
  input: InteractiveUpscaleToggleEligibilityInput,
): InteractiveUpscaleToggleEligibility {
  const capacity = resolveInteractiveUpscaleCapacity(input.asset);
  const mode = resolveArtworkEnhanceMode(input.artworkEnhanceMode);
  const needsUpscaleAtPrintSize = isInteractiveUpscaleGenerationOfferedAtPrintSize(
    capacity.baselineWidthPx,
    capacity.baselineHeightPx,
    input.printWidthInches,
    input.printHeightInches,
  );

  // STATE B / C — derivative exists: selection only, never regeneration policy.
  if (capacity.hasInteractiveDerivative) {
    const toggleEnabled = needsUpscaleAtPrintSize || mode === "enhanced";
    return {
      state: "generated",
      toggleEnabled,
      helperText: toggleEnabled
        ? mode === "enhanced"
          ? undefined
          : "Turn on to use the enhanced resolution for this item."
        : "Resolution is already sufficient for this print size",
      capacity,
    };
  }

  // STATE D — at cumulative max, no first-time generation possible.
  if (capacity.isAtMaximumResolution) {
    return {
      state: "maximum_resolution",
      toggleEnabled: false,
      helperText: "Maximum resolution reached",
      capacity,
    };
  }

  if (!needsUpscaleAtPrintSize) {
    return {
      state: "sufficient_capacity_remains",
      toggleEnabled: false,
      helperText: "Resolution is already sufficient for this print size",
      capacity,
    };
  }

  const enhanceTarget = resolveInteractiveEnhanceTargetPixels({
    baselineWidthPx: capacity.baselineWidthPx,
    baselineHeightPx: capacity.baselineHeightPx,
    nativeWidthPx: capacity.nativeWidthPx,
    nativeHeightPx: capacity.nativeHeightPx,
    printWidthInches: input.printWidthInches,
    printHeightInches: input.printHeightInches,
  });

  if (enhanceTarget) {
    return {
      state: "available",
      toggleEnabled: true,
      helperText: "Increase resolution for larger print sizes",
      capacity,
      enhanceTarget,
    };
  }

  return {
    state: "maximum_resolution",
    toggleEnabled: false,
    helperText: "Maximum resolution reached",
    capacity,
  };
}

export function resolveActiveArtworkPixelDimensions(input: {
  artworkEnhanceMode?: ArtworkEnhanceMode | null;
  baselineWidthPx: number;
  baselineHeightPx: number;
  enhancedWidthPx?: number | null;
  enhancedHeightPx?: number | null;
}): { widthPx: number; heightPx: number } {
  if (
    resolveArtworkEnhanceMode(input.artworkEnhanceMode) === "enhanced" &&
    typeof input.enhancedWidthPx === "number" &&
    input.enhancedWidthPx > 0 &&
    typeof input.enhancedHeightPx === "number" &&
    input.enhancedHeightPx > 0
  ) {
    return {
      widthPx: Math.round(input.enhancedWidthPx),
      heightPx: Math.round(input.enhancedHeightPx),
    };
  }

  return {
    widthPx: Math.round(input.baselineWidthPx),
    heightPx: Math.round(input.baselineHeightPx),
  };
}
