import type { Design } from "../../designs/types/design.types";
import type { AiReviewInboxTab } from "../types/aiReviewInbox.types";
import type { AiReviewTabCountDeltas } from "./aiReviewLocalReconciliation";

/**
 * Whether a live doc snapshot means a tracked reprocess has finished enough to
 * return to Needs Review / Rejected (or failed while still away from review).
 */
export function resolveTrackedReprocessTerminal(design: Design): {
  kind: "returned_to_review" | "failed" | "still_in_flight";
  reviewTab: "needs_review" | "rejected" | null;
} {
  if (design.aiReviewStatus === "needs_review") {
    return { kind: "returned_to_review", reviewTab: "needs_review" };
  }
  if (design.aiReviewStatus === "rejected") {
    return { kind: "returned_to_review", reviewTab: "rejected" };
  }
  if (design.aiProcessingStage === "failed") {
    return { kind: "failed", reviewTab: null };
  }
  return { kind: "still_in_flight", reviewTab: null };
}

export function computeTrackedReprocessReturnCountDeltas(input: {
  activeTab: AiReviewInboxTab;
  reviewTab: "needs_review" | "rejected";
}): AiReviewTabCountDeltas {
  const deltas: AiReviewTabCountDeltas = {};
  if (input.reviewTab === "needs_review") {
    deltas.needs_review = 1;
    deltas.processing = -1;
  } else {
    deltas.rejected = 1;
    deltas.processing = -1;
  }
  return deltas;
}

/**
 * True when the active inbox tab should upsert the returned design into the visible list.
 */
export function shouldUpsertTrackedReprocessReturn(input: {
  activeTab: AiReviewInboxTab;
  reviewTab: "needs_review" | "rejected";
}): boolean {
  return input.activeTab === input.reviewTab;
}
