/**
 * Development-only AI Processing queue trace (post-launch-catalog-and-processing-stability,
 * Owner QA Amendment 6, corrected in Amendment 6 follow-up for cross-window transport).
 *
 * Purpose: capture the exact live state overwrite that occurs when one background-AI design
 * finishes, so the real cause of the frozen Processing list/count can be identified from a real
 * owner reproduction instead of another speculative behavioral fix.
 *
 * Deliberately separate from `firestoreUsageTrace`: that collector records Firestore *operations*
 * (reads/writes/listeners) with its own schema. This one records AI-queue *state transitions*
 * (design IDs, bucket membership, counts, stages, request generations) — a different question,
 * different schema, and it must be independently enable-able without turning on full Firestore
 * tracing.
 *
 * Cross-window transport (Amendment 6 follow-up): the AI Processing workspace and the Firebase
 * Debug panel run in two separate Electron `BrowserWindow` renderer processes. A plain
 * module-level store in this file gives each process its OWN independent copy — writes from the
 * main Studio window's renderer never reach the Debug window's renderer, which is why the first
 * cut of this instrumentation always reported `{ enabled: false, eventCount: 0 }` no matter what
 * happened in the app. `AiQueueTraceStore` below is the pure, environment-agnostic collector
 * (sanitize + bound + enable flag) with no assumption about *where* it lives; the main Electron
 * process owns the one real instance (see `apps/studio/electron/ipc/aiQueueTrace/`), and every
 * renderer (both windows) talks to that single instance over the existing preload/IPC bridge
 * conventions — the same pattern already used for `firebaseDebug`'s cross-window snapshot sync.
 *
 * Safety contract (enforced by tests):
 * - Disabled unless the host explicitly enables it (dev-build + dev-project gated by the main
 *   process, once, not per-renderer).
 * - Bounded in-memory ring buffer; never persisted, never sent anywhere outside this process.
 * - Records IDs, counts, stages, and enum-like status strings ONLY. Never titles, descriptions,
 *   image paths/URLs, customer data, tokens, or secrets.
 */

export type AiQueueTraceSource =
  | "backgroundQueue"
  | "inbox"
  | "useDesigns"
  | "render";

export interface AiQueueTraceEventInput {
  /** Short, stable event name, e.g. "pump.start", "observer.received", "load.rejected". */
  event: string;
  source: AiQueueTraceSource;
  /** Design this event concerns, when applicable. */
  designId?: string | null;
  /** The inbox's currently selected design at the moment of the event. */
  selectedDesignId?: string | null;
  /** The design the background pump is actively working on, when known. */
  activeQueueDesignId?: string | null;
  /** IDs currently derived as the Processing bucket. */
  processingDesignIds?: readonly string[];
  /** IDs currently derived as the Needs Review bucket. */
  needsReviewDesignIds?: readonly string[];
  processingCount?: number | null;
  needsReviewCount?: number | null;
  /** Visible pipeline stage for the active/selected design (aiProcessingStage enum value). */
  visibleStage?: string | null;
  /** Incoming patch/status/stage carried by this event (enum-like values only). */
  incomingStatus?: string | null;
  incomingStage?: string | null;
  incomingReviewStatus?: string | null;
  /** Request/generation identifier where the writer has one (e.g. useDesigns generation). */
  requestId?: string | number | null;
  /** Remaining queued designs, for pump events. */
  queueRemaining?: number | null;
  /** Free-form short enum-like note, e.g. "accepted" | "rejected" | "no-op". */
  outcome?: string | null;
}

export interface AiQueueTraceEvent extends AiQueueTraceEventInput {
  seq: number;
  timestampMs: number;
}

export interface AiQueueTraceSnapshot {
  enabled: boolean;
  eventCount: number;
  maxEvents: number;
  events: AiQueueTraceEvent[];
}

export const AI_QUEUE_TRACE_MAX_EVENTS = 1_000;

/**
 * Field allowlist. Anything not named here is dropped before an event is stored, so a future
 * caller cannot accidentally widen what this trace captures (e.g. by spreading a whole Design).
 */
const ALLOWED_FIELDS = [
  "event",
  "source",
  "designId",
  "selectedDesignId",
  "activeQueueDesignId",
  "processingDesignIds",
  "needsReviewDesignIds",
  "processingCount",
  "needsReviewCount",
  "visibleStage",
  "incomingStatus",
  "incomingStage",
  "incomingReviewStatus",
  "requestId",
  "queueRemaining",
  "outcome",
] as const;

function sanitize(input: AiQueueTraceEventInput): AiQueueTraceEventInput {
  const output: Record<string, unknown> = {};
  const source = input as unknown as Record<string, unknown>;

  for (const field of ALLOWED_FIELDS) {
    const value = source[field];

    if (value === undefined) {
      continue;
    }

    if (field === "processingDesignIds" || field === "needsReviewDesignIds") {
      output[field] = Array.isArray(value)
        ? value.filter((entry): entry is string => typeof entry === "string")
        : [];
      continue;
    }

    output[field] = value;
  }

  return output as unknown as AiQueueTraceEventInput;
}

/**
 * Pure, environment-agnostic collector: no assumption about whether it lives in a browser
 * renderer, an Electron main process, or a test. Exactly one instance should exist per Studio
 * process at runtime (the Electron main process); every renderer is a client of that instance
 * over IPC (see aiQueueTraceIpcClient.ts), never a second instance of this class.
 */
export class AiQueueTraceStore {
  private enabled = false;
  private events: AiQueueTraceEvent[] = [];
  private nextSeq = 1;
  private readonly maxEvents: number;

  constructor(maxEvents: number = AI_QUEUE_TRACE_MAX_EVENTS) {
    this.maxEvents = maxEvents;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  reset(): void {
    this.events = [];
    this.nextSeq = 1;
  }

  append(input: AiQueueTraceEventInput): void {
    if (!this.enabled) {
      return;
    }

    this.events.push({
      ...sanitize(input),
      seq: this.nextSeq,
      timestampMs: Date.now(),
    });
    this.nextSeq += 1;

    if (this.events.length > this.maxEvents) {
      this.events.splice(0, this.events.length - this.maxEvents);
    }
  }

  getSnapshot(): AiQueueTraceSnapshot {
    return {
      enabled: this.enabled,
      eventCount: this.events.length,
      maxEvents: this.maxEvents,
      events: this.events.map((event) => ({ ...event })),
    };
  }
}
