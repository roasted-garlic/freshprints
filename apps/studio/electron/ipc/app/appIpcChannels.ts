export const APP_OPEN_DEV_TOOLS = "fresh-prints:app:open-dev-tools" as const;
export const APP_SET_UPLOAD_ACTIVE = "fresh-prints:app:set-upload-active" as const;
export const APP_CONFIRM_CLOSE = "fresh-prints:app:confirm-close" as const;
export const APP_OPEN_EXTERNAL_LINK = "fresh-prints:app:open-external-link" as const;
export const APP_GET_WINDOW_METRICS = "fresh-prints:app:get-window-metrics" as const;
export const APP_SET_MINIMUM_WINDOW_SIZE = "fresh-prints:app:set-minimum-window-size" as const;
export const APP_RESET_MINIMUM_WINDOW_SIZE = "fresh-prints:app:reset-minimum-window-size" as const;

export const APP_IPC_CHANNELS = {
  OPEN_DEV_TOOLS: APP_OPEN_DEV_TOOLS,
  SET_UPLOAD_ACTIVE: APP_SET_UPLOAD_ACTIVE,
  CONFIRM_CLOSE: APP_CONFIRM_CLOSE,
  OPEN_EXTERNAL_LINK: APP_OPEN_EXTERNAL_LINK,
  GET_WINDOW_METRICS: APP_GET_WINDOW_METRICS,
  SET_MINIMUM_WINDOW_SIZE: APP_SET_MINIMUM_WINDOW_SIZE,
  RESET_MINIMUM_WINDOW_SIZE: APP_RESET_MINIMUM_WINDOW_SIZE,
} as const;

export type AppIpcChannel = (typeof APP_IPC_CHANNELS)[keyof typeof APP_IPC_CHANNELS];

const ALLOWED_APP_IPC_CHANNELS = new Set<string>(Object.values(APP_IPC_CHANNELS));

export function isAllowedAppIpcChannel(channel: string): channel is AppIpcChannel {
  return ALLOWED_APP_IPC_CHANNELS.has(channel);
}

/** Main → renderer event: main is asking whether it's safe to close because an upload is active. */
export const APP_CONFIRM_CLOSE_REQUESTED = "fresh-prints:app:confirm-close-requested" as const;
