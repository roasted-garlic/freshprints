import {
  MIN_SMALL_FORMAT_PRINT_WIDTH_INCHES,
  PREFERRED_PRINT_WIDTH_INCHES,
  PRINT_INCHES_DECIMAL_PLACES,
  STANDARD_PRINT_WIDTH_INCHES,
  TARGET_PRINT_DPI,
} from "../constants/printSize.constants";
import type {
  AspectRatioPreserveResult,
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

function resolveAcceptanceLevel(maxPrintWidthInchesAtTarget: number): PrintSizeAcceptanceLevel {
  if (maxPrintWidthInchesAtTarget < MIN_SMALL_FORMAT_PRINT_WIDTH_INCHES) {
    return "reject";
  }

  if (maxPrintWidthInchesAtTarget < STANDARD_PRINT_WIDTH_INCHES) {
    return "small_format";
  }

  if (maxPrintWidthInchesAtTarget < PREFERRED_PRINT_WIDTH_INCHES) {
    return "warn";
  }

  return "accept";
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
 * Assesses print-size capability at target DPI using production-size tiers.
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
  const acceptanceLevel = resolveAcceptanceLevel(maxPrintWidthInchesAtTarget);

  const assessment: PrintSizeAssessment = {
    targetDpi,
    maxPrintWidthInchesAtTarget,
    maxPrintHeightInchesAtTarget,
    acceptanceLevel,
    meetsSmallFormatMinimum:
      maxPrintWidthInchesAtTarget >= MIN_SMALL_FORMAT_PRINT_WIDTH_INCHES,
    meetsStandardApparelWidth: maxPrintWidthInchesAtTarget >= STANDARD_PRINT_WIDTH_INCHES,
    meetsPreferredWidth: maxPrintWidthInchesAtTarget >= PREFERRED_PRINT_WIDTH_INCHES,
    suggestedPrintWidthInches: roundInches(maxPrintWidthInchesAtTarget),
    suggestedPrintHeightInches: roundInches(maxPrintHeightInchesAtTarget),
    suggestedEffectiveDpi: targetDpi,
  };

  return { success: true, assessment };
}

/** Derives print height from a target width while preserving pixel aspect ratio. */
export function preserveAspectRatioFromWidth(
  printWidthInches: number,
  pixelWidth: number,
  pixelHeight: number,
): AspectRatioPreserveResult {
  const widthError = validatePositiveInch(printWidthInches, "Print width in inches");
  if (widthError) {
    return { success: false, error: widthError };
  }

  const pixelError = validatePositivePixels(pixelWidth, pixelHeight);
  if (pixelError) {
    return { success: false, error: pixelError };
  }

  const aspectRatio = pixelHeight / pixelWidth;

  return {
    success: true,
    printWidthInches: roundInches(printWidthInches),
    printHeightInches: roundInches(printWidthInches * aspectRatio),
  };
}

/** Derives print width from a target height while preserving pixel aspect ratio. */
export function preserveAspectRatioFromHeight(
  printHeightInches: number,
  pixelWidth: number,
  pixelHeight: number,
): AspectRatioPreserveResult {
  const heightError = validatePositiveInch(printHeightInches, "Print height in inches");
  if (heightError) {
    return { success: false, error: heightError };
  }

  const pixelError = validatePositivePixels(pixelWidth, pixelHeight);
  if (pixelError) {
    return { success: false, error: pixelError };
  }

  const aspectRatio = pixelHeight / pixelWidth;

  return {
    success: true,
    printWidthInches: roundInches(printHeightInches / aspectRatio),
    printHeightInches: roundInches(printHeightInches),
  };
}
