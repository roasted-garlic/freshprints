import {
  MIN_ACCEPTABLE_EFFECTIVE_DPI,
  MIN_SMALL_FORMAT_PRINT_WIDTH_INCHES,
  PREFERRED_PRINT_WIDTH_INCHES,
  PRINT_INCHES_DECIMAL_PLACES,
  STANDARD_PRINT_WIDTH_INCHES,
  TARGET_PRINT_DPI,
} from "../constants/printSize.constants";
import type {
  EffectiveDpiCalculationResult,
  PrintSizeAssessment,
  PrintSizeAssessmentResult,
  PrintSizeAtTargetDpiResult,
} from "../types/printSize/printSize.types";
import type { PrintSizeAcceptanceLevel } from "../types/printSize/printSize.enums";

function roundInches(value: number): number {
  const factor = 10 ** PRINT_INCHES_DECIMAL_PLACES;
  return Math.round(value * factor) / factor;
}

function roundEffectiveDpi(value: number): number {
  return Math.round(value);
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

function validatePositiveInch(value: number, label: string): string | null {
  if (!Number.isFinite(value) || value <= 0) {
    return `${label} must be a positive finite number.`;
  }

  return null;
}

function validatePositiveTargetDpi(targetDpi: number): string | null {
  if (!Number.isFinite(targetDpi) || targetDpi <= 0) {
    return "Target DPI must be a positive finite number.";
  }

  return null;
}

/**
 * Selects normalization DPI for import: 300 DPI when the asset supports at least
 * 3.5″ width at 300 DPI; otherwise 72 DPI so persisted effectiveDpi reflects quality.
 */
export function resolveImportNormalizationTargetDpi(
  pixelWidth: number,
  assessmentTargetDpi: number = TARGET_PRINT_DPI,
): number {
  const widthAtAssessmentDpi = pixelWidth / assessmentTargetDpi;

  if (widthAtAssessmentDpi < MIN_SMALL_FORMAT_PRINT_WIDTH_INCHES) {
    return MIN_ACCEPTABLE_EFFECTIVE_DPI;
  }

  return assessmentTargetDpi;
}

function resolveAcceptanceLevelFromEffectiveDpi(effectiveDpi: number): PrintSizeAcceptanceLevel {
  if (effectiveDpi < MIN_ACCEPTABLE_EFFECTIVE_DPI) {
    return "reject";
  }

  if (effectiveDpi >= TARGET_PRINT_DPI) {
    return "accept";
  }

  if (effectiveDpi >= 250) {
    return "warn";
  }

  if (effectiveDpi >= 200) {
    return "small_format";
  }

  return "terrible";
}

export interface ImportUpscaleTargetPx {
  widthPx: number;
  heightPx: number;
}

/**
 * Returns the pixel dimensions an underpowered import should be upscaled to
 * so its width reaches PREFERRED_PRINT_WIDTH_INCHES at TARGET_PRINT_DPI,
 * preserving aspect ratio. Returns null when the image already meets that
 * width (no upscale needed).
 */
export function resolveImportUpscaleTargetPx(
  pixelWidth: number,
  pixelHeight: number,
  targetDpi: number = TARGET_PRINT_DPI,
  targetWidthInches: number = PREFERRED_PRINT_WIDTH_INCHES,
): ImportUpscaleTargetPx | null {
  const targetWidthPx = targetDpi * targetWidthInches;

  if (pixelWidth >= targetWidthPx) {
    return null;
  }

  return {
    widthPx: Math.round(targetWidthPx),
    heightPx: Math.round(pixelHeight * (targetWidthPx / pixelWidth)),
  };
}

function meetsMinimumPixelDimensions(pixelWidth: number, pixelHeight: number): boolean {
  return (
    Math.min(pixelWidth, pixelHeight) >= MIN_ACCEPTABLE_EFFECTIVE_DPI
  );
}

/**
 * Calculates production effective DPI from pixel dimensions and declared print size.
 * When aspect ratio is unlocked, uses the limiting (minimum) axis.
 */
export function calculateEffectiveDpi(
  pixelWidth: number,
  pixelHeight: number,
  printWidthInches: number,
  printHeightInches: number,
  aspectRatioLocked = true,
): EffectiveDpiCalculationResult {
  const pixelError = validatePositivePixels(pixelWidth, pixelHeight);
  if (pixelError) {
    return { success: false, error: pixelError };
  }

  const widthError = validatePositiveInch(printWidthInches, "Print width in inches");
  if (widthError) {
    return { success: false, error: widthError };
  }

  const heightError = validatePositiveInch(printHeightInches, "Print height in inches");
  if (heightError) {
    return { success: false, error: heightError };
  }

  if (aspectRatioLocked) {
    return {
      success: true,
      effectiveDpi: roundEffectiveDpi(pixelWidth / printWidthInches),
    };
  }

  const widthAxisDpi = pixelWidth / printWidthInches;
  const heightAxisDpi = pixelHeight / printHeightInches;
  const limitingAxis = widthAxisDpi <= heightAxisDpi ? "width" : "height";

  return {
    success: true,
    effectiveDpi: roundEffectiveDpi(Math.min(widthAxisDpi, heightAxisDpi)),
    limitingAxis,
  };
}

/** Computes normalized print size in inches at a target DPI from pixel dimensions. */
export function calculatePrintSizeAtTargetDpi(
  pixelWidth: number,
  pixelHeight: number,
  targetDpi: number = TARGET_PRINT_DPI,
): PrintSizeAtTargetDpiResult {
  const pixelError = validatePositivePixels(pixelWidth, pixelHeight);
  if (pixelError) {
    return { success: false, error: pixelError };
  }

  const dpiError = validatePositiveTargetDpi(targetDpi);
  if (dpiError) {
    return { success: false, error: dpiError };
  }

  return {
    success: true,
    targetDpi,
    printWidthInches: roundInches(pixelWidth / targetDpi),
    printHeightInches: roundInches(pixelHeight / targetDpi),
  };
}

/**
 * Assesses print-size capability for import using effective DPI at normalized print size.
 * Does not inspect embedded metadata DPI.
 */
export function assessPrintSizeCapability(
  pixelWidth: number,
  pixelHeight: number,
  targetDpi: number = TARGET_PRINT_DPI,
): PrintSizeAssessmentResult {
  const pixelError = validatePositivePixels(pixelWidth, pixelHeight);
  if (pixelError) {
    return { success: false, error: pixelError };
  }

  const dpiError = validatePositiveTargetDpi(targetDpi);
  if (dpiError) {
    return { success: false, error: dpiError };
  }

  const maxPrintWidthInchesAtTarget = pixelWidth / targetDpi;
  const maxPrintHeightInchesAtTarget = pixelHeight / targetDpi;
  const normalizationDpi = resolveImportNormalizationTargetDpi(pixelWidth, targetDpi);
  const normalizedPrintSize = calculatePrintSizeAtTargetDpi(
    pixelWidth,
    pixelHeight,
    normalizationDpi,
  );

  if (!normalizedPrintSize.success) {
    return normalizedPrintSize;
  }

  const effectiveDpiResult = calculateEffectiveDpi(
    pixelWidth,
    pixelHeight,
    normalizedPrintSize.printWidthInches,
    normalizedPrintSize.printHeightInches,
    true,
  );

  if (!effectiveDpiResult.success) {
    return effectiveDpiResult;
  }

  const meetsPixels = meetsMinimumPixelDimensions(pixelWidth, pixelHeight);
  const acceptanceLevel = meetsPixels
    ? resolveAcceptanceLevelFromEffectiveDpi(effectiveDpiResult.effectiveDpi)
    : "reject";

  const assessment: PrintSizeAssessment = {
    targetDpi: normalizationDpi,
    maxPrintWidthInchesAtTarget,
    maxPrintHeightInchesAtTarget,
    acceptanceLevel,
    meetsSmallFormatMinimum:
      maxPrintWidthInchesAtTarget >= MIN_SMALL_FORMAT_PRINT_WIDTH_INCHES,
    meetsStandardApparelWidth: maxPrintWidthInchesAtTarget >= STANDARD_PRINT_WIDTH_INCHES,
    meetsPreferredWidth: maxPrintWidthInchesAtTarget >= PREFERRED_PRINT_WIDTH_INCHES,
    suggestedPrintWidthInches: normalizedPrintSize.printWidthInches,
    suggestedPrintHeightInches: normalizedPrintSize.printHeightInches,
    suggestedEffectiveDpi: effectiveDpiResult.effectiveDpi,
  };

  return { success: true, assessment };
}
