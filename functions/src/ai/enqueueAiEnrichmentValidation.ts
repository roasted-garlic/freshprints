import { resolveAdditionalTagExclusions } from "./aiTagExclusions";
import { isAllowedVisionModelId, isAllowedOpenAiReasoningEffort } from "./aiEnrichmentConfig";

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

export function parseEnqueueAiEnrichmentRequest(data: unknown): {
  designId: string;
  rerunRejected: boolean;
  rerunFromReview: boolean;
  visionModelIdOverride?: string;
  reasoningEffortOverride?: string;
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
  const reasoningEffortOverride =
    "reasoningEffortOverride" in data && typeof data.reasoningEffortOverride === "string"
      ? data.reasoningEffortOverride.trim()
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

  if (reasoningEffortOverride && !isAllowedOpenAiReasoningEffort(reasoningEffortOverride)) {
    throw new Error("The selected reasoning effort override is not allowed.");
  }

  return {
    designId,
    rerunRejected,
    rerunFromReview,
    visionModelIdOverride: visionModelIdOverride || undefined,
    reasoningEffortOverride: reasoningEffortOverride || undefined,
  };
}

export function resolveStoredAdditionalTagExclusions(raw: unknown): string[] {
  return resolveAdditionalTagExclusions(raw);
}
