export const FIREBASE_DEBUG_IPC_CHANNELS = {
  CLOSE: "firebase-debug:close",
  COMMAND: "firebase-debug:command",
  GET_SNAPSHOT: "firebase-debug:get-snapshot",
  OPEN: "firebase-debug:open",
  PUBLISH_SNAPSHOT: "firebase-debug:publish-snapshot",
  SNAPSHOT: "firebase-debug:snapshot",
} as const;

const ALLOWED_CHANNELS = new Set<string>(Object.values(FIREBASE_DEBUG_IPC_CHANNELS));

export function isAllowedFirebaseDebugIpcChannel(channel: string): boolean {
  return ALLOWED_CHANNELS.has(channel);
}
