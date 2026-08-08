import { AI_PROCESSING_STAGES, type AiProcessingStage } from "@fresh-prints/shared/types/ai/aiProcessing.types";
import { isAiReviewStatus } from "../../designs/types/aiReview.types";
import type { Design } from "../../designs/types/design.types";
import { isDesignStatus } from "../../designs/types/designStatus.types";

interface EnqueueResultTerminalFields {
  aiProcessingStage?: string | null;
  aiReviewStatus?: string | null;
  completed?: boolean;
  queued: boolean;
  reason?: string;
  status?: string | null;
}

function isAiProcessingStage(value: string): value is AiProcessingStage {
  return (AI_PROCESSING_STAGES as readonly string[]).includes(value);
}

/**
 * Build a local `Design` patch from an `enqueueAiEnrichment` callable result so the renderer can
 * reflect the design's true current terminal state immediately, without waiting on a Firestore
 * reload or subscription. Covers two cases that both carry a real, authoritative terminal state:
 *
 * - `queued: true, completed: true` — this call itself ran the pipeline synchronously to
 *   completion.
 * - `queued: false, reason: "already_terminal"` — a stale/duplicate call found the design had
 *   already reached its desired terminal state from an earlier call; the server still returns
 *   the design's real current fields so the client can reconcile local state (Processing/Needs
 *   Review bucket membership, counts) without treating this as a failure
 *   (post-launch-catalog-and-processing-stability, Workstream D).
 *
 * Returns null for every other case (genuinely still in-flight, or a real failure), or when no
 * recognized fields are present.
 */
export function buildDesignPatchFromEnqueueResult(
  result: EnqueueResultTerminalFields,
): Partial<Design> | null {
  const isRealTerminalResult =
    (result.queued && result.completed) || (!result.queued && result.reason === "already_terminal");

  if (!isRealTerminalResult) {
    return null;
  }

  const patch: Partial<Design> = {};

  if (typeof result.aiProcessingStage === "string" && isAiProcessingStage(result.aiProcessingStage)) {
    patch.aiProcessingStage = result.aiProcessingStage;
  }

  if (typeof result.aiReviewStatus === "string" && isAiReviewStatus(result.aiReviewStatus)) {
    patch.aiReviewStatus = result.aiReviewStatus;
  }

  if (typeof result.status === "string" && isDesignStatus(result.status)) {
    patch.status = result.status;
  }

  return Object.keys(patch).length > 0 ? patch : null;
}
