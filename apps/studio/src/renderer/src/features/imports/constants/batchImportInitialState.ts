import type { UseBatchImportState } from "../types/batchImportHook.types";

/** Defaults for batch import workflow state (session settings live on ImportsPage). */
export const BATCH_IMPORT_INITIAL_STATE: UseBatchImportState = {
  phase: "idle",
  isBusy: false,
  jobId: null,
  sourceType: null,
  discoveryResult: null,
  uploadReport: null,
  error: null,
  warning: null,
  progress: null,
  excludedFilePaths: [],
  suggestDarkByPath: {},
  itemBackgroundOverrides: {},
  itemHalftoneOverrides: {},
};
