import {
  MIN_ACCEPTABLE_EFFECTIVE_DPI,
  PRINT_INCHES_DECIMAL_PLACES,
  TARGET_PRINT_DPI,
} from "../constants/printSize.constants";
import { calculateEffectiveDpi } from "./printSizeMath";

export const MAX_STANDARD_PRINT_REQUEST_SIZE_INCHES = 22;
export const STANDARD_PRINT_REQUEST_INITIAL_WIDTH_INCHES = 10;

export type PrintRequestItemDpiQualityLevel = "optimal" | "good" | "minimum" | "below_minimum";

export interface PrintRequestItemSizeInput {
  pixelWidth: number;
  pixelHeight: number;
  printWidthInches: number;
  printHeightInches: number;
}

export interface PrintRequestItemSizeAssessment {
  effectiveDpi: number;
  qualityLevel: PrintRequestItemDpiQualityLevel;
  qualityLabel: string;
  canSave: boolean;
  warningMessage?: string;
  errorMessage?: string;
}

export interface InitialPrintRequestItemSizeInput {
  pixelWidth: number;
  pixelHeight: number;
  defaultPrintWidthInches?: number;
}

export interface InitialPrintRequestItemSize {
  printWidthInches: number;
  printHeightInches: number;
}

function roundInches(value: number): number {
  const factor = 10 ** PRINT_INCHES_DECIMAL_PLACES;
  return Math.round(value * factor) / factor;
}

function validatePositiveInches(printWidthInches: number, printHeightInches: number): string | null {
  if (!Number.isFinite(printWidthInches) || printWidthInches <= 0) {
    return "Requested width must be greater than 0 inches.";
  }

  if (!Number.isFinite(printHeightInches) || printHeightInches <= 0) {
    return "Requested height must be greater than 0 inches.";
  }

  return null;
}

function validatePixelDimensions(pixelWidth: number, pixelHeight: number): string | null {
  if (!Number.isFinite(pixelWidth) || pixelWidth <= 0 || !Number.isFinite(pixelHeight) || pixelHeight <= 0) {
    return "Design pixel dimensions are required to validate requested size.";
  }

  return null;
}

export function calculateLockedHeightFromWidth(
  pixelWidth: number,
  pixelHeight: number,
  printWidthInches: number,
): number {
  const pixelError = validatePixelDimensions(pixelWidth, pixelHeight);
  if (pixelError) {
    throw new Error(pixelError);
  }

  if (!Number.isFinite(printWidthInches) || printWidthInches <= 0) {
    throw new Error("Requested width must be greater than 0 inches.");
  }

  return roundInches(printWidthInches * (pixelHeight / pixelWidth));
}

export function calculateLockedWidthFromHeight(
  pixelWidth: number,
  pixelHeight: number,
  printHeightInches: number,
): number {
  const pixelError = validatePixelDimensions(pixelWidth, pixelHeight);
  if (pixelError) {
    throw new Error(pixelError);
  }

  if (!Number.isFinite(printHeightInches) || printHeightInches <= 0) {
    throw new Error("Requested height must be greater than 0 inches.");
  }

  return roundInches(printHeightInches * (pixelWidth / pixelHeight));
}

function resolveInitialSourceWidthInches(input: InitialPrintRequestItemSizeInput): number {
  if (typeof input.defaultPrintWidthInches === "number" && input.defaultPrintWidthInches > 0) {
    return roundInches(input.defaultPrintWidthInches);
  }

  return roundInches(input.pixelWidth / TARGET_PRINT_DPI);
}

export function resolveInitialPrintRequestItemSize(
  input: InitialPrintRequestItemSizeInput,
): InitialPrintRequestItemSize {
  const pixelError = validatePixelDimensions(input.pixelWidth, input.pixelHeight);
  if (pixelError) {
    throw new Error(pixelError);
  }

  const sourceWidth = resolveInitialSourceWidthInches(input);
  if (!Number.isFinite(sourceWidth) || sourceWidth <= 0) {
    throw new Error("Requested width must be greater than 0 inches.");
  }

  const maxWidthForStandardHeight = calculateLockedWidthFromHeight(
    input.pixelWidth,
    input.pixelHeight,
    MAX_STANDARD_PRINT_REQUEST_SIZE_INCHES,
  );
  const printWidthInches = roundInches(
    Math.min(
      sourceWidth,
      STANDARD_PRINT_REQUEST_INITIAL_WIDTH_INCHES,
      MAX_STANDARD_PRINT_REQUEST_SIZE_INCHES,
      maxWidthForStandardHeight,
    ),
  );

  if (!Number.isFinite(printWidthInches) || printWidthInches <= 0) {
    throw new Error("Requested width must be greater than 0 inches.");
  }

  return {
    printWidthInches,
    printHeightInches: calculateLockedHeightFromWidth(input.pixelWidth, input.pixelHeight, printWidthInches),
  };
}

export function resolvePrintRequestItemDpiQualityLevel(effectiveDpi: number): PrintRequestItemDpiQualityLevel {
  if (!Number.isFinite(effectiveDpi) || effectiveDpi < MIN_ACCEPTABLE_EFFECTIVE_DPI) {
    return "below_minimum";
  }

  if (effectiveDpi >= 300) {
    return "optimal";
  }

  if (effectiveDpi >= 200) {
    return "good";
  }

  return "minimum";
}

export function getPrintRequestItemDpiQualityLabel(level: PrintRequestItemDpiQualityLevel): string {
  switch (level) {
    case "optimal":
      return "Optimal";
    case "good":
      return "Good";
    case "minimum":
      return "Minimum";
    case "below_minimum":
      return "Below Minimum";
    default:
      return level;
  }
}

export function assessPrintRequestItemSize(input: PrintRequestItemSizeInput): PrintRequestItemSizeAssessment {
  const inchError = validatePositiveInches(input.printWidthInches, input.printHeightInches);
  if (inchError) {
    return {
      effectiveDpi: 0,
      qualityLevel: "below_minimum",
      qualityLabel: getPrintRequestItemDpiQualityLabel("below_minimum"),
      canSave: false,
      errorMessage: inchError,
    };
  }

  const pixelError = validatePixelDimensions(input.pixelWidth, input.pixelHeight);
  if (pixelError) {
    return {
      effectiveDpi: 0,
      qualityLevel: "below_minimum",
      qualityLabel: getPrintRequestItemDpiQualityLabel("below_minimum"),
      canSave: false,
      errorMessage: pixelError,
    };
  }

  const dpiResult = calculateEffectiveDpi(
    input.pixelWidth,
    input.pixelHeight,
    input.printWidthInches,
    input.printHeightInches,
    true,
  );

  if (!dpiResult.success) {
    return {
      effectiveDpi: 0,
      qualityLevel: "below_minimum",
      qualityLabel: getPrintRequestItemDpiQualityLabel("below_minimum"),
      canSave: false,
      errorMessage: dpiResult.error,
    };
  }

  const qualityLevel = resolvePrintRequestItemDpiQualityLevel(dpiResult.effectiveDpi);
  const qualityLabel = getPrintRequestItemDpiQualityLabel(qualityLevel);

  if (
    input.printWidthInches > MAX_STANDARD_PRINT_REQUEST_SIZE_INCHES ||
    input.printHeightInches > MAX_STANDARD_PRINT_REQUEST_SIZE_INCHES
  ) {
    return {
      effectiveDpi: dpiResult.effectiveDpi,
      qualityLevel,
      qualityLabel,
      canSave: false,
      errorMessage: "Requested standard print sizes cannot exceed 22 inches. Use a Custom Request for this item.",
    };
  }

  if (qualityLevel === "below_minimum") {
    return {
      effectiveDpi: dpiResult.effectiveDpi,
      qualityLevel,
      qualityLabel,
      canSave: false,
      errorMessage: "Requested size is below the 72 DPI minimum for standard Print Requests.",
    };
  }

  if (qualityLevel === "good" || qualityLevel === "minimum") {
    return {
      effectiveDpi: dpiResult.effectiveDpi,
      qualityLevel,
      qualityLabel,
      canSave: true,
      warningMessage: "Requested size is below 300 DPI. It can be saved, but print quality may be reduced.",
    };
  }

  return {
    effectiveDpi: dpiResult.effectiveDpi,
    qualityLevel,
    qualityLabel,
    canSave: true,
  };
}

export function formatPrintRequestItemSizeLabel(printWidthInches: number, printHeightInches: number): string {
  return `${printWidthInches.toFixed(2)} x ${printHeightInches.toFixed(2)} in`;
}
