export const EXPORT_SHOW_ZIP = "fresh-prints:export:export-show-zip" as const;
export const EXPORT_PROGRESS = "fresh-prints:export:progress" as const;
export const EXPORT_GANG_SHEET_PNG = "fresh-prints:export:export-gang-sheet-png" as const;
export const EXPORT_GANG_SHEET_PROGRESS = "fresh-prints:export:gang-sheet-progress" as const;

export const EXPORT_IPC_CHANNELS = {
  EXPORT_SHOW_ZIP,
  EXPORT_GANG_SHEET_PNG,
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
