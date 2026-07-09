export const INBOX_ALERT_SELECT_LOCAL_SOUND = "fresh-prints:inbox-alert:select-local-sound" as const;
export const INBOX_ALERT_GET_LOCAL_SOUND_PLAYABLE_URL =
  "fresh-prints:inbox-alert:get-local-sound-playable-url" as const;
export const INBOX_ALERT_CLEAR_LOCAL_SOUND = "fresh-prints:inbox-alert:clear-local-sound" as const;

export const INBOX_ALERT_IPC_CHANNELS = {
  SELECT_LOCAL_SOUND: INBOX_ALERT_SELECT_LOCAL_SOUND,
  GET_LOCAL_SOUND_PLAYABLE_URL: INBOX_ALERT_GET_LOCAL_SOUND_PLAYABLE_URL,
  CLEAR_LOCAL_SOUND: INBOX_ALERT_CLEAR_LOCAL_SOUND,
} as const;

export type InboxAlertIpcChannel = (typeof INBOX_ALERT_IPC_CHANNELS)[keyof typeof INBOX_ALERT_IPC_CHANNELS];

const ALLOWED_INBOX_ALERT_IPC_CHANNELS = new Set<string>(Object.values(INBOX_ALERT_IPC_CHANNELS));

export function isAllowedInboxAlertIpcChannel(channel: string): channel is InboxAlertIpcChannel {
  return ALLOWED_INBOX_ALERT_IPC_CHANNELS.has(channel);
}
