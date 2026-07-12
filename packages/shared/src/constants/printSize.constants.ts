/** Target production resolution for DTF print normalization and assessment. */
export const TARGET_PRINT_DPI = 300;

/**
 * Width threshold at TARGET_PRINT_DPI — below this, import normalizes at
 * MIN_ACCEPTABLE_EFFECTIVE_DPI instead of 300 DPI.
 */
export const MIN_SMALL_FORMAT_PRINT_WIDTH_INCHES = 3.5;

/** Minimum accepted effective DPI at import-normalized print size. */
export const MIN_ACCEPTABLE_EFFECTIVE_DPI = 72;

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

/** Effective DPI at or above this value is optimal (green). */
export const EFFECTIVE_DPI_OPTIMAL_MIN = 300;

/** Effective DPI at or above this value is good (yellow). */
export const EFFECTIVE_DPI_GOOD_MIN = 250;

/** Effective DPI at or above this value is bad (red). */
export const EFFECTIVE_DPI_BAD_MIN = 200;

/**
 * Minimum effective DPI allowed when saving a size on a standard Print Request item.
 * Import can still accept lower-resolution catalog assets; request sizing cannot go below this floor.
 */
export const MIN_PRINT_REQUEST_EFFECTIVE_DPI = EFFECTIVE_DPI_BAD_MIN;

/** @deprecated Use EFFECTIVE_DPI_OPTIMAL_MIN */
export const EFFECTIVE_DPI_PREFERRED_MIN = EFFECTIVE_DPI_OPTIMAL_MIN;

/** @deprecated Use EFFECTIVE_DPI_GOOD_MIN */
export const EFFECTIVE_DPI_STANDARD_MIN = EFFECTIVE_DPI_GOOD_MIN;

/** @deprecated Use EFFECTIVE_DPI_BAD_MIN */
export const EFFECTIVE_DPI_SMALL_FORMAT_MIN = EFFECTIVE_DPI_BAD_MIN;
