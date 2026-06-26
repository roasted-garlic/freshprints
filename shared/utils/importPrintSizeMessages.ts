import {
  MIN_ACCEPTABLE_EFFECTIVE_DPI,
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
  return "Effective DPI is below 300 but acceptable for many production uses.";
}

export function formatPrintSizeSmallFormatMessage(): string {
  return "Effective DPI may appear soft on larger apparel prints.";
}

export function formatPrintSizeTerribleMessage(): string {
  return `Effective DPI is at the minimum accepted import floor (${MIN_ACCEPTABLE_EFFECTIVE_DPI} DPI) — suitable for small prints only.`;
}

export function formatPrintSizeRejectedMessage(
  minEffectiveDpi: number = MIN_ACCEPTABLE_EFFECTIVE_DPI,
): string {
  return `Image cannot meet the minimum ${minEffectiveDpi} DPI effective resolution at import-normalized print size.`;
}

/** @deprecated Use formatPrintSizeStandardApparelMessage */
export function formatPrintSizeBelowPreferredMessage(
  preferredWidthInches: number = PREFERRED_PRINT_WIDTH_INCHES,
): string {
  void preferredWidthInches;
  return formatPrintSizeStandardApparelMessage();
}
