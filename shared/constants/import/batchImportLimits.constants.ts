import { MAX_SINGLE_PNG_SIZE_BYTES } from "../importValidation.constants";

export { MAX_SINGLE_PNG_SIZE_BYTES };

/** Maximum PNG files processed per batch job. */
export const MAX_BATCH_FILES = 500;

/** Maximum compressed ZIP archive size accepted for import (Google Drive ~2 GB parts). */
export const MAX_ZIP_SIZE_BYTES = Math.floor(2.1 * 1024 * 1024 * 1024);

/**
 * Maximum cumulative uncompressed bytes extracted from a ZIP during import.
 * Separate from archive size — mitigates ZIP bombs and excessive disk use.
 * Extraction streams entry-by-entry; this is a cumulative budget guard.
 */
export const MAX_EXTRACTED_BYTES = 10 * 1024 * 1024 * 1024;

/** Maximum ZIP entries scanned before extraction aborts. */
export const MAX_ZIP_ENTRIES = 2000;

/** Abort extraction when uncompressed-to-compressed ratio exceeds this value (100:1). */
export const MAX_ZIP_COMPRESSION_RATIO = 100;

/** Maximum directory entries visited during a folder scan. */
export const MAX_FOLDER_SCAN_ENTRIES = 10_000;

/** Maximum folder depth when recursively scanning for PNG files. */
export const MAX_FOLDER_DEPTH = 12;

/** Maximum `.zip` archives processed during a single folder batch discovery. */
export const MAX_FOLDER_ZIPS = 50;

/** Maximum nested ZIP-in-ZIP extraction depth (0 = outer archive only). */
export const MAX_NESTED_ZIP_DEPTH = 3;

/** Parallel Firebase Storage uploads during batch import (renderer). */
export const UPLOAD_CONCURRENCY = 2;

/** PNG validation concurrency in main process during batch discovery. */
export const VALIDATION_CONCURRENCY = 1;
