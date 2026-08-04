import { resolveAdditionalTagExclusions } from "./aiTagExclusions";
import { isAllowedVisionModelId } from "./aiEnrichmentConfig";

export interface EnqueueAiEnrichmentFlags {
  rerunRejected?: boolean;
  rerunFromReview?: boolean;
}

export function isRerunFromReviewEligible(design: Record<string, unknown>): boolean {
  return design.status === "imported" && design.aiReviewStatus === "needs_review";
}

export function shouldAllowAiEnqueueForReviewStatus(
  design: Record<string, unknown>,
  flags: EnqueueAiEnrichmentFlags,
): boolean {
  if (flags.rerunFromReview) {
    return isRerunFromReviewEligible(design);
  }

  if (flags.rerunRejected) {
    return design.status === "rejected";
  }

  return !design.aiReviewStatus || design.aiReviewStatus === "pending";
}

/**
 * A plain (non-rerun) enqueue call rejected by shouldAllowAiEnqueueForReviewStatus is not
 * automatically a genuine failure — the most common real-world cause is a stale/duplicate call
 * racing a design that already reached its desired terminal state (aiReviewStatus ===
 * "needs_review", i.e. processing already completed successfully). The caller should treat that
 * case as an idempotent no-op, not surface "This design is no longer eligible for automatic AI
 * enqueue." as a hard failure (post-launch-catalog-and-processing-stability, Workstream D).
 *
 * Only a plain enqueue call can hit this path — rerunFromReview/rerunRejected calls have their own
 * distinct eligibility checks upstream and are never classified as already-terminal here.
 */
export function isAlreadyTerminalPlainEnqueue(
  design: Record<string, unknown>,
  flags: EnqueueAiEnrichmentFlags,
): boolean {
  if (flags.rerunFromReview || flags.rerunRejected) {
    return false;
  }

  return design.aiReviewStatus === "needs_review" || design.aiReviewStatus === "approved";
}

export function parseEnqueueAiEnrichmentRequest(data: unknown): {
  designId: string;
  rerunRejected: boolean;
  rerunFromReview: boolean;
  visionModelIdOverride?: string;
} {
  if (!data || typeof data !== "object") {
    throw new Error("Request data is required.");
  }

  const designId = "designId" in data && typeof data.designId === "string" ? data.designId.trim() : "";
  const rerunRejected = "rerunRejected" in data && data.rerunRejected === true;
  const rerunFromReview = "rerunFromReview" in data && data.rerunFromReview === true;
  const visionModelIdOverride =
    "visionModelIdOverride" in data && typeof data.visionModelIdOverride === "string"
      ? data.visionModelIdOverride.trim()
      : "";

  if (!designId) {
    throw new Error("A design ID is required.");
  }

  if (rerunRejected && rerunFromReview) {
    throw new Error("Only one rerun mode may be requested at a time.");
  }

  if (visionModelIdOverride && !isAllowedVisionModelId(visionModelIdOverride)) {
    throw new Error("The selected vision model override is not allowed.");
  }

  return {
    designId,
    rerunRejected,
    rerunFromReview,
    visionModelIdOverride: visionModelIdOverride || undefined,
  };
}

export function resolveStoredAdditionalTagExclusions(raw: unknown): string[] {
  return resolveAdditionalTagExclusions(raw);
}
