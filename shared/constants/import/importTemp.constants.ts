/** Directory name under the OS temp folder for Fresh Prints import work. */
export const IMPORT_TEMP_ROOT_DIR_NAME = "fresh-prints-imports";

/**
 * Conservative age threshold for stale per-job temp directories.
 * Not applied automatically at startup in Step 5 — used by explicit cleanup helper.
 */
export const STALE_IMPORT_TEMP_DIR_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Batch import job IDs are UUIDs created in the main process. */
export const IMPORT_JOB_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
