export const EXPORT_SHOW_ZIP = "fresh-prints:export:export-show-zip" as const;
export const EXPORT_PROGRESS = "fresh-prints:export:progress" as const;
export const GENERATE_GANG_SHEET_PNG = "fresh-prints:export:generate-gang-sheet-png" as const;
export const EXPORT_CACHED_GANG_SHEETS = "fresh-prints:export:export-cached-gang-sheets" as const;
export const DOWNLOAD_CACHED_GANG_SHEET = "fresh-prints:export:download-cached-gang-sheet" as const;
export const CLEAR_GANG_SHEET_CACHE = "fresh-prints:export:clear-gang-sheet-cache" as const;
export const CLEAR_ALL_GANG_SHEET_CACHE = "fresh-prints:export:clear-all-gang-sheet-cache" as const;
export const GET_GANG_SHEET_CACHE_STATUS = "fresh-prints:export:get-gang-sheet-cache-status" as const;
export const EXPORT_GANG_SHEET_PROGRESS = "fresh-prints:export:gang-sheet-progress" as const;

/** @deprecated Use GENERATE_GANG_SHEET_PNG + EXPORT_CACHED_GANG_SHEETS. */
export const EXPORT_GANG_SHEET_PNG = "fresh-prints:export:export-gang-sheet-png" as const;

export const EXPORT_IPC_CHANNELS = {
  EXPORT_SHOW_ZIP,
  GENERATE_GANG_SHEET_PNG,
  EXPORT_CACHED_GANG_SHEETS,
  DOWNLOAD_CACHED_GANG_SHEET,
  CLEAR_GANG_SHEET_CACHE,
  CLEAR_ALL_GANG_SHEET_CACHE,
  GET_GANG_SHEET_CACHE_STATUS,
} as const;

export const EXPORT_IPC_EVENT_CHANNELS = {
  PROGRESS: EXPORT_PROGRESS,
  GANG_SHEET_PROGRESS: EXPORT_GANG_SHEET_PROGRESS,
} as const;

export type ExportIpcChannel = (typeof EXPORT_IPC_CHANNELS)[keyof typeof EXPORT_IPC_CHANNELS];

export type ExportIpcEventChannel =
  (typeof EXPORT_IPC_EVENT_CHANNELS)[keyof typeof EXPORT_IPC_EVENT_CHANNELS];

const ALLOWED_EXPORT_IPC_CHANNELS = new Set<string>(Object.values(EXPORT_IPC_CHANNELS));

const ALLOWED_EXPORT_IPC_EVENT_CHANNELS = new Set<string>(Object.values(EXPORT_IPC_EVENT_CHANNELS));

export function isAllowedExportIpcChannel(channel: string): channel is ExportIpcChannel {
  return ALLOWED_EXPORT_IPC_CHANNELS.has(channel);
}

export function isAllowedExportIpcEventChannel(channel: string): channel is ExportIpcEventChannel {
  return ALLOWED_EXPORT_IPC_EVENT_CHANNELS.has(channel);
}
