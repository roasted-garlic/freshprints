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

/** Preferred apparel print width at target DPI (request defaults + messaging). */
export const PREFERRED_PRINT_WIDTH_INCHES = 10;

/**
 * One-pass automated production upscale target width at TARGET_PRINT_DPI (ADR-FP-080 v3).
 * Distinct from DEFAULT_PRINT_REQUEST_WIDTH_INCHES — retains resize headroom above the
 * normal Print Request default without changing request sizing directly.
 */
export const AUTOMATED_UPSCALE_TARGET_WIDTH_INCHES = 15;

/**
 * @deprecated ADR-FP-080 — 15″ is the approved-max width envelope, not an upscale floor.
 * Prefer MAX_APPROVED_PRINT_WIDTH_INCHES / imageQualitySizingPolicy.
 * Kept as alias so legacy call sites compile until fully migrated.
 */
export const IMPORT_UPSCALE_TARGET_WIDTH_INCHES = 15;

/**
 * @deprecated Prefer EXTENDED_UPSCALE_FACTOR_THRESHOLD for staff soft-quality messaging.
 * Soft-quality / extended-upscale visibility now triggers above 2× (ADR-FP-080).
 */
export const IMPORT_UPSCALE_SOFT_SCALE_FACTOR_THRESHOLD = 2;

/** Version string persisted on processed assets (ADR-FP-080 v3 — 15″ upscale target, ≤6× cumulative). */
export const IMAGE_QUALITY_SIZING_POLICY_VERSION = "image-quality-v3" as const;

/**
 * Normal print-request default width when approved max allows it.
 * Do not confuse with AUTOMATED_UPSCALE_TARGET_WIDTH_INCHES.
 */
export const DEFAULT_PRINT_REQUEST_WIDTH_INCHES = PREFERRED_PRINT_WIDTH_INCHES;

/** @deprecated Prefer DEFAULT_PRINT_REQUEST_WIDTH_INCHES */
export const DEFAULT_REQUEST_PRINT_WIDTH_INCHES = DEFAULT_PRINT_REQUEST_WIDTH_INCHES;

/** Maximum approved print width under the quality envelope (inches). */
export const MAX_APPROVED_PRINT_WIDTH_INCHES = 15;

/** Maximum approved print height under the quality envelope (inches). */
export const MAX_APPROVED_PRINT_HEIGHT_INCHES = 16.5;

/** Maximum linear upscale factor for a single controlled pass (ADR-FP-080). */
export const MAX_UPSCALE_FACTOR = 6;

/**
 * Upscales strictly above this factor are marked extended for staff visibility
 * (do not block upload/print). Exact 2.0× is not extended.
 */
export const EXTENDED_UPSCALE_FACTOR_THRESHOLD = 2;

/** Maximum number of upscale passes (never more than one). */
export const MAX_UPSCALE_PASSES = 1;

/**
 * Relative near-target tolerance — skip upscale when already within this fraction
 * of the aspect-locked standard target (5%).
 */
export const NEAR_TARGET_TOLERANCE_RATIO = 0.05;

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
