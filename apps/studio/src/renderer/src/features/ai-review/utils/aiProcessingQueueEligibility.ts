import type { Design } from "../../designs/types/design.types";
import { resolveAiProcessingOutputStatus } from "../utils/aiProcessingOutput";

/** Design is imported and waiting for staff to start AI (no active pipeline stage). */
export function isDesignAwaitingAiStart(design: Design): boolean {
  return resolveAiProcessingOutputStatus(design) === "not_generated";
}

/** Design has an active AI pipeline stage in progress. */
export function isDesignAiProcessingInProgress(design: Design): boolean {
  return resolveAiProcessingOutputStatus(design) === "waiting";
}

export function isDesignAiProcessingFailed(design: Design): boolean {
  return resolveAiProcessingOutputStatus(design) === "failed";
}

export function isAiProcessingTerminal(design: Design): boolean {
  if (design.aiReviewStatus === "needs_review") {
    return true;
  }

  const stage = design.aiProcessingStage;

  return stage === "ready_for_review" || stage === "failed";
}
