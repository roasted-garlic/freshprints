/** Customer upload size / batch / abuse limits (public Portal — not staff import limits). */

export const CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES = 100 * 1024 * 1024;

export const CUSTOMER_UPLOAD_MAX_FILES_PER_BATCH = 100;

export const CUSTOMER_UPLOAD_MAX_BATCH_UNCOMPRESSED_BYTES = 2 * 1024 * 1024 * 1024;

export const CUSTOMER_UPLOAD_MAX_DIMENSION_PX = 15_000;

export const CUSTOMER_UPLOAD_MAX_TOTAL_PIXELS = 100_000_000;

/** Max concurrent finalize operations per customer (in flight). Shared across purposes. */
export const CUSTOMER_UPLOAD_MAX_CONCURRENT_FINALIZE = 8;

/**
 * Per-UID daily caps (UTC calendar day) — enforced in callables.
 * Print-request and catalog-donation use **separate** counters so a large donate day
 * does not exhaust print-request quota (and vice versa).
 */
export const CUSTOMER_UPLOAD_DAILY_CREATE_BATCH_LIMIT = 100;

export const CUSTOMER_UPLOAD_DAILY_FINALIZE_IMAGE_LIMIT = 200;

export const CUSTOMER_UPLOAD_DAILY_FINALIZE_ZIP_LIMIT = 5;

/** Catalog-donation purpose only (separate bucket from print-request). */
export const CUSTOMER_UPLOAD_DAILY_CREATE_BATCH_LIMIT_DONATION = 200;

export const CUSTOMER_UPLOAD_DAILY_FINALIZE_IMAGE_LIMIT_DONATION = 500;

export const CUSTOMER_UPLOAD_DAILY_FINALIZE_ZIP_LIMIT_DONATION = 20;

export const CUSTOMER_UPLOAD_MAX_ZIP_COMPRESSED_BYTES = 2 * 1024 * 1024 * 1024;

export const CUSTOMER_UPLOAD_MAX_ZIP_DECOMPRESSED_BYTES = 2 * 1024 * 1024 * 1024;

export const CUSTOMER_UPLOAD_MAX_ZIP_ENTRIES = 100;

export const CUSTOMER_UPLOAD_MAX_ZIP_COMPRESSION_RATIO = 20;

/** Nested ZIP depth: 0 = reject any nested archive. */
export const CUSTOMER_UPLOAD_MAX_NESTED_ZIP_DEPTH = 0;

export const CUSTOMER_UPLOAD_ALLOWED_SOURCE_FORMATS = ["png", "webp"] as const;

export type CustomerUploadAllowedSourceFormat =
  (typeof CUSTOMER_UPLOAD_ALLOWED_SOURCE_FORMATS)[number];
