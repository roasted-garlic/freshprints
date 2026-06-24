export const IMPORT_SELECT_SINGLE_PNG = "fresh-prints:import:select-single-png" as const;

export const IMPORT_VALIDATE_SELECTED_PNG = "fresh-prints:import:validate-selected-png" as const;

export const IMPORT_READ_SELECTED_PNG_BYTES = "fresh-prints:import:read-selected-png-bytes" as const;

export const IMPORT_GET_SELECTED_PNG_PREVIEW = "fresh-prints:import:get-selected-png-preview" as const;

export const IMPORT_SELECT_MULTIPLE_PNG = "fresh-prints:import:select-multiple-png" as const;

export const IMPORT_SELECT_IMPORT_FOLDER = "fresh-prints:import:select-import-folder" as const;

export const IMPORT_SELECT_IMPORT_ZIP = "fresh-prints:import:select-import-zip" as const;

export const IMPORT_START_BATCH_DISCOVERY = "fresh-prints:import:start-batch-discovery" as const;

export const IMPORT_CANCEL_BATCH_JOB = "fresh-prints:import:cancel-batch-job" as const;

export const IMPORT_FINISH_BATCH_JOB = "fresh-prints:import:finish-batch-job" as const;

export const IMPORT_CLEAR_SINGLE_PNG_IMPORT = "fresh-prints:import:clear-single-png-import" as const;

export const IMPORT_BATCH_PROGRESS = "fresh-prints:import:batch-progress" as const;

export const IMPORT_BATCH_DISCOVERY_COMPLETE = "fresh-prints:import:batch-discovery-complete" as const;

export const IMPORT_BATCH_JOB_ERROR = "fresh-prints:import:batch-job-error" as const;

/** Dev-only — not registered in packaged builds */
export const IMPORT_VERIFY_DERIVATIVE_GENERATION =
  "fresh-prints:import:verify-derivative-generation" as const;

export const IMPORT_IPC_CHANNELS = {
  SELECT_SINGLE_PNG: IMPORT_SELECT_SINGLE_PNG,
  VALIDATE_SELECTED_PNG: IMPORT_VALIDATE_SELECTED_PNG,
  READ_SELECTED_PNG_BYTES: IMPORT_READ_SELECTED_PNG_BYTES,
  GET_SELECTED_PNG_PREVIEW: IMPORT_GET_SELECTED_PNG_PREVIEW,
  SELECT_MULTIPLE_PNG: IMPORT_SELECT_MULTIPLE_PNG,
  SELECT_IMPORT_FOLDER: IMPORT_SELECT_IMPORT_FOLDER,
  SELECT_IMPORT_ZIP: IMPORT_SELECT_IMPORT_ZIP,
  START_BATCH_DISCOVERY: IMPORT_START_BATCH_DISCOVERY,
  CANCEL_BATCH_JOB: IMPORT_CANCEL_BATCH_JOB,
  FINISH_BATCH_JOB: IMPORT_FINISH_BATCH_JOB,
  CLEAR_SINGLE_PNG_IMPORT: IMPORT_CLEAR_SINGLE_PNG_IMPORT,
} as const;

export const DEV_IMPORT_IPC_CHANNELS = {
  VERIFY_DERIVATIVE_GENERATION: IMPORT_VERIFY_DERIVATIVE_GENERATION,
} as const;

export const IMPORT_IPC_EVENT_CHANNELS = {
  BATCH_PROGRESS: IMPORT_BATCH_PROGRESS,
  BATCH_DISCOVERY_COMPLETE: IMPORT_BATCH_DISCOVERY_COMPLETE,
  BATCH_JOB_ERROR: IMPORT_BATCH_JOB_ERROR,
} as const;

export type ImportIpcChannel = (typeof IMPORT_IPC_CHANNELS)[keyof typeof IMPORT_IPC_CHANNELS];

export type ImportIpcEventChannel =
  (typeof IMPORT_IPC_EVENT_CHANNELS)[keyof typeof IMPORT_IPC_EVENT_CHANNELS];

const ALLOWED_IMPORT_IPC_CHANNELS = new Set<string>(Object.values(IMPORT_IPC_CHANNELS));

const ALLOWED_IMPORT_IPC_EVENT_CHANNELS = new Set<string>(
  Object.values(IMPORT_IPC_EVENT_CHANNELS),
);

const ALLOWED_DEV_IMPORT_IPC_CHANNELS = new Set<string>(Object.values(DEV_IMPORT_IPC_CHANNELS));

export function isAllowedImportIpcChannel(channel: string): channel is ImportIpcChannel {
  return ALLOWED_IMPORT_IPC_CHANNELS.has(channel);
}

export function isAllowedImportIpcEventChannel(channel: string): channel is ImportIpcEventChannel {
  return ALLOWED_IMPORT_IPC_EVENT_CHANNELS.has(channel);
}

export function isAllowedDevImportIpcChannel(
  channel: string,
): channel is (typeof DEV_IMPORT_IPC_CHANNELS)[keyof typeof DEV_IMPORT_IPC_CHANNELS] {
  return ALLOWED_DEV_IMPORT_IPC_CHANNELS.has(channel);
}
