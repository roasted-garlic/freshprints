/** Target production resolution for DTF print normalization and assessment. */
export const TARGET_PRINT_DPI = 300;

/** Hard minimum printable width at target DPI — designs below this are rejected. */
export const MIN_SMALL_FORMAT_PRINT_WIDTH_INCHES = 3.5;

/** Standard apparel print width at target DPI — below preferred but above small-format only. */
export const STANDARD_PRINT_WIDTH_INCHES = 8;

/** Preferred apparel print width at target DPI. */
export const PREFERRED_PRINT_WIDTH_INCHES = 10;

/**
 * Staff-facing preferred width target for messaging and future UI defaults.
 * Normalized import width is still computed per file as `pixelWidth / TARGET_PRINT_DPI`.
 */
export const DEFAULT_PRINT_WIDTH_INCHES = PREFERRED_PRINT_WIDTH_INCHES;

/**
 * Sanity cap for future staff-entered print width validation.
 * Natural maximum for a file is `pixelWidth / TARGET_PRINT_DPI`.
 */
export const MAX_REASONABLE_PRINT_WIDTH_INCHES = 72;

/** Decimal places for persisted and displayed print inch values. */
export const PRINT_INCHES_DECIMAL_PLACES = 2;

/** Effective DPI at or above this value is preferred for production. */
export const EFFECTIVE_DPI_PREFERRED_MIN = 300;

/** Effective DPI at or above this value is standard quality. */
export const EFFECTIVE_DPI_STANDARD_MIN = 250;

/** Effective DPI at or above this value is small-format quality. */
export const EFFECTIVE_DPI_SMALL_FORMAT_MIN = 200;
