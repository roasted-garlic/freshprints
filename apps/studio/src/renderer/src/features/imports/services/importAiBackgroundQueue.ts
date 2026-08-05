import { aiEnrichmentEnqueueService } from "../../ai-review/services/aiEnrichmentEnqueueService";
import { logPipelineEvent } from "../../../shared/utils/pipelineLog";

/**
 * Session-scoped sequential AI enqueue for Studio import.
 * Batch import pushes each design as soon as that file's pipeline succeeds
 * (while other files may still be uploading). Single import pushes on success.
 * Not gated on Processing-tab Auto advance.
 * Dedupes design ids and never fires concurrent enqueueAiEnrichment calls.
 */
const pendingDesignIds: string[] = [];
const seenDesignIds = new Set<string>();
let isPumpRunning = false;

/**
 * Owner QA Amendment 3, Failure 1: this pump is already strictly sequential (one awaited
 * enqueueForProcessing at a time), but it was entirely detached from the AI Review UI — it never
 * signalled a design's terminal transition, so Processing stayed at its initial count while all
 * designs completed server-side, then jumped straight to zero on the next unrelated reload.
 *
 * These observers let AI Review reconcile one design at a time as each terminal transition
 * happens. Deliberately a plain in-process callback set: no Firestore listener, no polling, no
 * extra reads, and no change to the one-at-a-time execution model.
 */
export interface BackgroundAiQueueEvent {
  designId: string;
  /** Remaining queued designs after this one settled (0 once the pump drains). */
  pending: number;
  outcome: "completed" | "failed";
  /**
   * The enqueue callable's own terminal fields (aiProcessingStage/aiReviewStatus/status/queued/
   * reason), when available. Lets the observer apply an authoritative local patch for exactly
   * this design instead of triggering a full reload — a reload has no way to distinguish "this
   * design's own terminal transition" from "some other in-flight request," so multiple designs
   * completing in quick succession previously raced each other through independent, ungated
   * reloadDesigns() calls (Owner QA Amendment 4).
   */
  patchSource?: {
    aiProcessingStage?: string | null;
    aiReviewStatus?: string | null;
    completed?: boolean;
    queued: boolean;
    reason?: string;
    status?: string | null;
  };
}

type BackgroundAiQueueObserver = (event: BackgroundAiQueueEvent) => void;

const observers = new Set<BackgroundAiQueueObserver>();

/** Subscribe to per-design terminal transitions. Returns an unsubscribe function. */
export function subscribeToBackgroundAiQueue(
  observer: BackgroundAiQueueObserver,
): () => void {
  observers.add(observer);
  return () => {
    observers.delete(observer);
  };
}

/** True while the pump still has queued work — used to gate active-only UI reconciliation. */
export function hasPendingBackgroundAiWork(): boolean {
  return isPumpRunning || pendingDesignIds.length > 0;
}

function notifyObservers(event: BackgroundAiQueueEvent): void {
  for (const observer of [...observers]) {
    try {
      observer(event);
    } catch {
      // An observer must never break the queue pump.
    }
  }
}

export function enqueueImportedDesignsForBackgroundAi(designIds: readonly string[]): void {
  let added = 0;
  for (const rawId of designIds) {
    const designId = rawId.trim();
    if (!designId || seenDesignIds.has(designId)) {
      continue;
    }
    seenDesignIds.add(designId);
    pendingDesignIds.push(designId);
    added += 1;
  }

  if (added === 0) {
    return;
  }

  logPipelineEvent("import.ai_background.queued", {
    added,
    pending: pendingDesignIds.length,
  });

  void pumpBackgroundAiQueue();
}

async function pumpBackgroundAiQueue(): Promise<void> {
  if (isPumpRunning) {
    return;
  }

  isPumpRunning = true;
  try {
    while (pendingDesignIds.length > 0) {
      const designId = pendingDesignIds.shift();
      if (!designId) {
        continue;
      }

      try {
        const result = await aiEnrichmentEnqueueService.enqueueForProcessing(designId);
        logPipelineEvent("import.ai_background.enqueued", { designId });
        notifyObservers({
          designId,
          pending: pendingDesignIds.length,
          outcome: "completed",
          patchSource: result,
        });
      } catch (error) {
        logPipelineEvent("import.ai_background.enqueue_failed", {
          designId,
          message: error instanceof Error ? error.message : "Unknown error",
        });
        notifyObservers({ designId, pending: pendingDesignIds.length, outcome: "failed" });
      }
    }
  } finally {
    isPumpRunning = false;
    if (pendingDesignIds.length > 0) {
      void pumpBackgroundAiQueue();
    }
  }
}
