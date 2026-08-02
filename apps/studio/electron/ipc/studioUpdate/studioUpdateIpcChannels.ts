export const STUDIO_UPDATE_GET_STATE = "fresh-prints:studio-update:get-state" as const;
export const STUDIO_UPDATE_CHECK = "fresh-prints:studio-update:check" as const;
export const STUDIO_UPDATE_DOWNLOAD = "fresh-prints:studio-update:download" as const;
export const STUDIO_UPDATE_RESTART_AND_INSTALL =
  "fresh-prints:studio-update:restart-and-install" as const;
export const STUDIO_UPDATE_POSTPONE = "fresh-prints:studio-update:postpone" as const;

export const STUDIO_UPDATE_IPC_CHANNELS = {
  GET_STATE: STUDIO_UPDATE_GET_STATE,
  CHECK: STUDIO_UPDATE_CHECK,
  DOWNLOAD: STUDIO_UPDATE_DOWNLOAD,
  RESTART_AND_INSTALL: STUDIO_UPDATE_RESTART_AND_INSTALL,
  POSTPONE: STUDIO_UPDATE_POSTPONE,
} as const;

export type StudioUpdateIpcChannel =
  (typeof STUDIO_UPDATE_IPC_CHANNELS)[keyof typeof STUDIO_UPDATE_IPC_CHANNELS];

const ALLOWED_STUDIO_UPDATE_IPC_CHANNELS = new Set<string>(
  Object.values(STUDIO_UPDATE_IPC_CHANNELS),
);

export function isAllowedStudioUpdateIpcChannel(
  channel: string,
): channel is StudioUpdateIpcChannel {
  return ALLOWED_STUDIO_UPDATE_IPC_CHANNELS.has(channel);
}

/** Main → renderer event: the update state machine changed (check/progress/error/etc). */
export const STUDIO_UPDATE_STATE_CHANGED = "fresh-prints:studio-update:state-changed" as const;
