import { ipcMain } from "electron";

import { AiQueueTraceStore, type AiQueueTraceEventInput } from "@fresh-prints/shared/utils/aiQueueTrace";

import { AI_QUEUE_TRACE_IPC_CHANNELS } from "./aiQueueTraceIpcChannels";

interface RegisterAiQueueTraceIpcHandlersOptions {
  isPackaged: () => boolean;
}

/**
 * The one real AiQueueTraceStore instance for the whole Studio process. Both the main Studio
 * window and the Firebase Debug window are IPC clients of this single instance (see
 * aiQueueTraceIpcClient.ts) — this is what makes the trace visible across both renderer
 * processes, unlike the first cut of this instrumentation which kept the store as renderer
 * module state and therefore gave each window its own independent, disconnected copy.
 */
const store = new AiQueueTraceStore();

export function registerAiQueueTraceIpcHandlers(
  options: RegisterAiQueueTraceIpcHandlersOptions,
): void {
  // Enabled exactly once, here, for the lifetime of the process — never per-renderer, and never
  // in a packaged (production) build. This is the sole enable point; no renderer can turn it on.
  store.setEnabled(!options.isPackaged());

  ipcMain.on(AI_QUEUE_TRACE_IPC_CHANNELS.APPEND, (_event, input: AiQueueTraceEventInput) => {
    if (options.isPackaged()) return;
    store.append(input);
  });

  ipcMain.handle(AI_QUEUE_TRACE_IPC_CHANNELS.GET_SNAPSHOT, () => {
    if (options.isPackaged()) {
      return { enabled: false, eventCount: 0, maxEvents: 0, events: [] };
    }
    return store.getSnapshot();
  });

  ipcMain.on(AI_QUEUE_TRACE_IPC_CHANNELS.RESET, () => {
    if (options.isPackaged()) return;
    store.reset();
  });

  ipcMain.handle(AI_QUEUE_TRACE_IPC_CHANNELS.IS_ENABLED, () => !options.isPackaged() && store.isEnabled());
}

/** Exported for tests only — the production Studio never imports this. */
export function getAiQueueTraceStoreForTests(): AiQueueTraceStore {
  return store;
}
