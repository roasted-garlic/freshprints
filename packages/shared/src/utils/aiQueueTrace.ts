/**
 * Development-only AI Processing queue trace (post-launch-catalog-and-processing-stability,
 * Owner QA Amendment 6).
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
 * Safety contract (enforced by tests):
 * - Disabled unless the host explicitly enables it (dev-build + dev-project gated by the caller).
 * - Bounded in-memory ring buffer; never persisted, never sent anywhere.
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

const MAX_EVENTS = 1_000;

interface AiQueueTraceState {
  enabled: boolean;
  events: AiQueueTraceEvent[];
  nextSeq: number;
}

const state: AiQueueTraceState = {
  enabled: false,
  events: [],
  nextSeq: 1,
};

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

export function isAiQueueTraceEnabled(): boolean {
  return state.enabled;
}

export function setAiQueueTraceEnabled(enabled: boolean): void {
  state.enabled = enabled;
}

export function resetAiQueueTrace(): void {
  state.events = [];
  state.nextSeq = 1;
}

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

/** Records one AI-queue state transition. No-op unless tracing has been explicitly enabled. */
export function traceAiQueueEvent(input: AiQueueTraceEventInput): void {
  if (!state.enabled) {
    return;
  }

  state.events.push({
    ...sanitize(input),
    seq: state.nextSeq,
    timestampMs: Date.now(),
  });
  state.nextSeq += 1;

  if (state.events.length > MAX_EVENTS) {
    state.events.splice(0, state.events.length - MAX_EVENTS);
  }
}

export interface AiQueueTraceSnapshot {
  enabled: boolean;
  eventCount: number;
  maxEvents: number;
  events: AiQueueTraceEvent[];
}

export function getAiQueueTraceSnapshot(): AiQueueTraceSnapshot {
  return {
    enabled: state.enabled,
    eventCount: state.events.length,
    maxEvents: MAX_EVENTS,
    events: state.events.map((event) => ({ ...event })),
  };
}

export const AI_QUEUE_TRACE_MAX_EVENTS = MAX_EVENTS;
