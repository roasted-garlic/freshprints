export const APP_OPEN_DEV_TOOLS = "fresh-prints:app:open-dev-tools" as const;

export const APP_IPC_CHANNELS = {
  OPEN_DEV_TOOLS: APP_OPEN_DEV_TOOLS,
} as const;

export type AppIpcChannel = (typeof APP_IPC_CHANNELS)[keyof typeof APP_IPC_CHANNELS];

const ALLOWED_APP_IPC_CHANNELS = new Set<string>(Object.values(APP_IPC_CHANNELS));

export function isAllowedAppIpcChannel(channel: string): channel is AppIpcChannel {
  return ALLOWED_APP_IPC_CHANNELS.has(channel);
}
