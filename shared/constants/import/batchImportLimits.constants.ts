import { MAX_SINGLE_PNG_SIZE_BYTES } from "../importValidation.constants";

export { MAX_SINGLE_PNG_SIZE_BYTES };

/** Maximum PNG files processed per batch job (aligns with design library list limit). */
export const MAX_BATCH_FILES = 100;

/** Maximum compressed ZIP archive size accepted for import. */
export const MAX_ZIP_SIZE_BYTES = 200 * 1024 * 1024;

/**
 * Maximum cumulative uncompressed bytes extracted from a ZIP during import.
 * Separate from archive size — mitigates ZIP bombs and excessive disk use.
 */
export const MAX_EXTRACTED_BYTES = 500 * 1024 * 1024;

/** Maximum ZIP entries scanned before extraction aborts. */
export const MAX_ZIP_ENTRIES = 500;

/** Abort extraction when uncompressed-to-compressed ratio exceeds this value (100:1). */
export const MAX_ZIP_COMPRESSION_RATIO = 100;

/** Maximum directory entries visited during a folder scan. */
export const MAX_FOLDER_SCAN_ENTRIES = 10_000;

/** Maximum folder depth when recursively scanning for PNG files. */
export const MAX_FOLDER_DEPTH = 12;

/** Parallel Firebase Storage uploads during batch import (renderer). */
export const UPLOAD_CONCURRENCY = 2;

/** PNG validation concurrency in main process during batch discovery. */
export const VALIDATION_CONCURRENCY = 1;
