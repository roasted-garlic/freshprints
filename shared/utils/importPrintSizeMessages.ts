import {
  MIN_SMALL_FORMAT_PRINT_WIDTH_INCHES,
  PREFERRED_PRINT_WIDTH_INCHES,
  PRINT_INCHES_DECIMAL_PLACES,
  TARGET_PRINT_DPI,
} from "../constants/printSize.constants";

function formatInches(value: number): string {
  return value.toFixed(PRINT_INCHES_DECIMAL_PLACES);
}

export function formatPrintSizeNormalizedMessage(
  printWidthInches: number,
  printHeightInches: number,
  targetDpi: number = TARGET_PRINT_DPI,
): string {
  return `Print size normalized to ${formatInches(printWidthInches)} in × ${formatInches(printHeightInches)} in at ${targetDpi} DPI.`;
}

export function formatPrintSizeStandardApparelMessage(): string {
  return "Image meets standard apparel print size but is below the preferred 10 inch width.";
}

export function formatPrintSizeSmallFormatMessage(): string {
  return "Image is suitable for small-format prints at 300 DPI, but may require upscaling for larger apparel prints.";
}

export function formatPrintSizeRejectedMessage(
  minWidthInches: number = MIN_SMALL_FORMAT_PRINT_WIDTH_INCHES,
  targetDpi: number = TARGET_PRINT_DPI,
): string {
  return `Image cannot achieve the minimum ${minWidthInches} inch print width at ${targetDpi} DPI.`;
}

/** @deprecated Use formatPrintSizeStandardApparelMessage */
export function formatPrintSizeBelowPreferredMessage(
  preferredWidthInches: number = PREFERRED_PRINT_WIDTH_INCHES,
): string {
  void preferredWidthInches;
  return formatPrintSizeStandardApparelMessage();
}
