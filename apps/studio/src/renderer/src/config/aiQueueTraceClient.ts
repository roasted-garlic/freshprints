import type { AiQueueTraceEventInput, AiQueueTraceSnapshot } from "@fresh-prints/shared/utils/aiQueueTrace";

/**
 * Renderer-side client for the main-process AI queue trace store (Owner QA Amendment 6 follow-up
 * — cross-window transport fix). Every call site in either renderer window (the main Studio
 * window and the Firebase Debug window) goes through this same thin IPC wrapper, so both windows
 * are reading and writing the one real store in the Electron main process instead of each having
 * its own disconnected, renderer-local copy.
 *
 * `traceAiQueueEvent` is a fire-and-forget `ipcRenderer.send` — it must never await anything or
 * throw, since it is called from hot paths (every design list load, every patch) and must not add
 * latency or a new failure mode to real AI Processing behavior.
 */
export function traceAiQueueEvent(input: AiQueueTraceEventInput): void {
  window.freshPrints?.aiQueueTrace?.append(input);
}

export function resetAiQueueTrace(): void {
  window.freshPrints?.aiQueueTrace?.reset();
}

export function getAiQueueTraceSnapshot(): Promise<AiQueueTraceSnapshot> {
  return (
    window.freshPrints?.aiQueueTrace?.getSnapshot() ??
    Promise.resolve({ enabled: false, eventCount: 0, maxEvents: 0, events: [] })
  );
}

export function isAiQueueTraceEnabled(): Promise<boolean> {
  return window.freshPrints?.aiQueueTrace?.isEnabled() ?? Promise.resolve(false);
}
