import type { Design } from "../../designs/types/design.types";
import type { BackgroundAiQueueEvent } from "../../imports/services/importAiBackgroundQueue";
import { buildDesignPatchFromEnqueueResult } from "./enqueueResultPatch";

export interface BackgroundAiQueueReconciliationResult {
  /** The patch to apply via applyDesignPatch, or null when no usable terminal patch exists
   * (e.g. the enqueue call itself failed) — the caller should fall back to a gated reload. */
  patch: Partial<Design> | null;
  /** Index (within the pre-patch `designs` array) to hand to pendingAdvanceIndexRef, or null when
   * the completed design was not the current selection (no advance needed here). */
  pendingAdvanceIndex: number | null;
}

/**
 * Pure decision for reconciling one background-AI-queue terminal event into local Processing-tab
 * state, without waiting on (or racing) a Firestore reload.
 *
 * Owner QA Amendment 4: the prior fix (Amendment 3) called an unconditional, ungated
 * `reloadDesigns()` per terminal event. Three designs completing in quick succession fired three
 * independent reloads with no protection against a same-query race — an earlier-started-but-
 * later-resolving read could overwrite state a later-started read had already correctly updated,
 * regressing visible progress and stalling the 3 -> 2 -> 1 -> 0 sequence. This function is the
 * authoritative, monotonic alternative: it derives everything needed from the event's own
 * terminal fields (already returned by the enqueue callable), so the caller never needs to wait
 * for or trust a subsequent reload's timing.
 */
export function reconcileBackgroundAiQueueEvent(
  event: BackgroundAiQueueEvent,
  designs: readonly Design[],
  selectedDesignId: string | null,
): BackgroundAiQueueReconciliationResult {
  const patch = event.patchSource ? buildDesignPatchFromEnqueueResult(event.patchSource) : null;

  if (!patch) {
    return { patch: null, pendingAdvanceIndex: null };
  }

  let pendingAdvanceIndex: number | null = null;

  if (selectedDesignId === event.designId) {
    const currentIndex = designs.findIndex((design) => design.id === event.designId);
    if (currentIndex >= 0) {
      pendingAdvanceIndex = currentIndex;
    }
  }

  return { patch, pendingAdvanceIndex };
}
