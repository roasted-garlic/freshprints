export const WHATNOT_IMPORT_OPEN_WINDOW = "fresh-prints:whatnot-import:open-window" as const;
export const WHATNOT_IMPORT_CLOSE_WINDOW = "fresh-prints:whatnot-import:close-window" as const;
export const WHATNOT_IMPORT_REPORT_COMPLETED =
  "fresh-prints:whatnot-import:report-completed" as const;

export const WHATNOT_IMPORT_IPC_CHANNELS = {
  OPEN_WINDOW: WHATNOT_IMPORT_OPEN_WINDOW,
  CLOSE_WINDOW: WHATNOT_IMPORT_CLOSE_WINDOW,
  REPORT_COMPLETED: WHATNOT_IMPORT_REPORT_COMPLETED,
} as const;

export type WhatnotImportIpcChannel =
  (typeof WHATNOT_IMPORT_IPC_CHANNELS)[keyof typeof WHATNOT_IMPORT_IPC_CHANNELS];

const ALLOWED_WHATNOT_IMPORT_IPC_CHANNELS = new Set<string>(Object.values(WHATNOT_IMPORT_IPC_CHANNELS));

export function isAllowedWhatnotImportIpcChannel(channel: string): channel is WhatnotImportIpcChannel {
  return ALLOWED_WHATNOT_IMPORT_IPC_CHANNELS.has(channel);
}

/** Main → owner-window renderer: staff confirmed a selection in the import window's shell. */
export const WHATNOT_IMPORT_CONFIRMED_EVENT = "fresh-prints:whatnot-import:import-confirmed" as const;

// --- Shell-window-only channels (never exposed to the main app window's preload) ---

export const WHATNOT_IMPORT_SHELL_SCAN = "fresh-prints:whatnot-import-shell:scan" as const;
export const WHATNOT_IMPORT_SHELL_CONFIRM = "fresh-prints:whatnot-import-shell:confirm" as const;
export const WHATNOT_IMPORT_SHELL_CANCEL = "fresh-prints:whatnot-import-shell:cancel" as const;

export const WHATNOT_IMPORT_SHELL_IPC_CHANNELS = {
  SCAN: WHATNOT_IMPORT_SHELL_SCAN,
  CONFIRM: WHATNOT_IMPORT_SHELL_CONFIRM,
  CANCEL: WHATNOT_IMPORT_SHELL_CANCEL,
} as const;

export type WhatnotImportShellIpcChannel =
  (typeof WHATNOT_IMPORT_SHELL_IPC_CHANNELS)[keyof typeof WHATNOT_IMPORT_SHELL_IPC_CHANNELS];

const ALLOWED_WHATNOT_IMPORT_SHELL_IPC_CHANNELS = new Set<string>(
  Object.values(WHATNOT_IMPORT_SHELL_IPC_CHANNELS),
);

export function isAllowedWhatnotImportShellIpcChannel(
  channel: string,
): channel is WhatnotImportShellIpcChannel {
  return ALLOWED_WHATNOT_IMPORT_SHELL_IPC_CHANNELS.has(channel);
}

/** Main → shell window: report the owner window's import outcome. */
export const WHATNOT_IMPORT_SHELL_COMPLETED_EVENT =
  "fresh-prints:whatnot-import-shell:import-completed" as const;
