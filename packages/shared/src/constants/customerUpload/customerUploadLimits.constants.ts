/** Customer upload size / batch / abuse limits (public Portal — not staff import limits). */

export const CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES = 80 * 1024 * 1024;

export const CUSTOMER_UPLOAD_MAX_FILES_PER_BATCH = 100;

export const CUSTOMER_UPLOAD_MAX_BATCH_UNCOMPRESSED_BYTES = 2 * 1024 * 1024 * 1024;

export const CUSTOMER_UPLOAD_MAX_DIMENSION_PX = 15_000;

export const CUSTOMER_UPLOAD_MAX_TOTAL_PIXELS = 100_000_000;

/** Max concurrent finalize operations per customer (in flight). Shared across purposes. */
export const CUSTOMER_UPLOAD_MAX_CONCURRENT_FINALIZE = 8;

/**
 * Per-UID daily caps (America/Chicago calendar day, CST/CDT) — enforced in callables.
 * Print-request and catalog-donation use **separate** counters so a large donate day
 * does not exhaust print-request quota (and vice versa).
 * Studio Settings (`settings/customerUploadQuotas`) can override these code defaults live.
 * Portal Upload Designs no longer charges these day buckets (Current Request room `L`);
 * Donate Designs still charges images/day.
 */
export const CUSTOMER_UPLOAD_DAILY_CREATE_BATCH_LIMIT = 10;

export const CUSTOMER_UPLOAD_DAILY_FINALIZE_IMAGE_LIMIT = 20;

export const CUSTOMER_UPLOAD_DAILY_FINALIZE_ZIP_LIMIT = 2;

/** Catalog-donation purpose only (separate bucket from print-request). */
export const CUSTOMER_UPLOAD_DAILY_CREATE_BATCH_LIMIT_DONATION = 400;

export const CUSTOMER_UPLOAD_DAILY_FINALIZE_IMAGE_LIMIT_DONATION = 1000;

export const CUSTOMER_UPLOAD_DAILY_FINALIZE_ZIP_LIMIT_DONATION = 40;

/**
 * Absolute ZIP byte ceiling (compressed and decompressed).
 * Portal Upload Designs and Donate Designs both allow ZIPs up to this ceiling.
 * Storage rules and Functions use the same value via {@link computeCustomerUploadMaxZipBytes}.
 * Images inside a ZIP still respect {@link CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES}.
 */
export const CUSTOMER_UPLOAD_MAX_ZIP_BYTES_CEILING = 2 * 1024 * 1024 * 1024;

/** @deprecated Prefer {@link CUSTOMER_UPLOAD_MAX_ZIP_BYTES_CEILING} or computed max. */
export const CUSTOMER_UPLOAD_MAX_ZIP_COMPRESSED_BYTES = CUSTOMER_UPLOAD_MAX_ZIP_BYTES_CEILING;

/** @deprecated Prefer {@link CUSTOMER_UPLOAD_MAX_ZIP_BYTES_CEILING} or computed max. */
export const CUSTOMER_UPLOAD_MAX_ZIP_DECOMPRESSED_BYTES = CUSTOMER_UPLOAD_MAX_ZIP_BYTES_CEILING;

/**
 * Customer ZIP max bytes for print-request and donation flows.
 * Fixed at the 2 GB ceiling (no longer derived from images/day × single-image bytes).
 * Trailing args are kept for call-site compatibility and ignored.
 */
export function computeCustomerUploadMaxZipBytes(
  _imagesDailyLimit?: number,
  _maxSingleImageBytes?: number,
  ceilingBytes: number = CUSTOMER_UPLOAD_MAX_ZIP_BYTES_CEILING,
): number {
  const safeCeiling =
    Number.isFinite(ceilingBytes) && ceilingBytes > 0
      ? Math.floor(ceilingBytes)
      : CUSTOMER_UPLOAD_MAX_ZIP_BYTES_CEILING;
  return safeCeiling;
}

export const CUSTOMER_UPLOAD_MAX_ZIP_ENTRIES = 100;

export const CUSTOMER_UPLOAD_MAX_ZIP_COMPRESSION_RATIO = 20;

/** Nested ZIP depth: 0 = reject any nested archive. */
export const CUSTOMER_UPLOAD_MAX_NESTED_ZIP_DEPTH = 0;

export const CUSTOMER_UPLOAD_ALLOWED_SOURCE_FORMATS = ["png", "webp"] as const;

export type CustomerUploadAllowedSourceFormat =
  (typeof CUSTOMER_UPLOAD_ALLOWED_SOURCE_FORMATS)[number];
