import { AI_PROCESSING_STAGES, type AiProcessingStage } from "@fresh-prints/shared/types/ai/aiProcessing.types";
import { isAiReviewStatus } from "../../designs/types/aiReview.types";
import type { Design } from "../../designs/types/design.types";
import { isDesignStatus } from "../../designs/types/designStatus.types";

interface EnqueueResultTerminalFields {
  aiProcessingStage?: string | null;
  aiReviewStatus?: string | null;
  completed?: boolean;
  queued: boolean;
  status?: string | null;
}

function isAiProcessingStage(value: string): value is AiProcessingStage {
  return (AI_PROCESSING_STAGES as readonly string[]).includes(value);
}

/**
 * Build a local `Design` patch from a completed `enqueueAiEnrichment` callable result so the
 * renderer can reflect the terminal AI state immediately, without waiting on a Firestore
 * reload or subscription. Returns null when the result is not a real terminal run, or when no
 * recognized fields are present.
 */
export function buildDesignPatchFromEnqueueResult(
  result: EnqueueResultTerminalFields,
): Partial<Design> | null {
  if (!result.queued || !result.completed) {
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
