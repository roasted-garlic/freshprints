import type { AiQueueTraceEventInput, AiQueueTraceSnapshot } from "../../utils/aiQueueTrace";

export interface FreshPrintsAiQueueTraceApi {
  /** Fire-and-forget append from either renderer window to the main-process store. */
  append(event: AiQueueTraceEventInput): void;
  /** Reads the current snapshot from the main-process store. */
  getSnapshot(): Promise<AiQueueTraceSnapshot>;
  /** Clears the main-process store. */
  reset(): void;
  /** Whether the main process has the trace enabled (dev build only). */
  isEnabled(): Promise<boolean>;
}
