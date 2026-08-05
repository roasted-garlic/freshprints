export const AI_QUEUE_TRACE_IPC_CHANNELS = {
  APPEND: "ai-queue-trace:append",
  GET_SNAPSHOT: "ai-queue-trace:get-snapshot",
  RESET: "ai-queue-trace:reset",
  IS_ENABLED: "ai-queue-trace:is-enabled",
} as const;

const ALLOWED_CHANNELS = new Set<string>(Object.values(AI_QUEUE_TRACE_IPC_CHANNELS));

export function isAllowedAiQueueTraceIpcChannel(channel: string): boolean {
  return ALLOWED_CHANNELS.has(channel);
}
