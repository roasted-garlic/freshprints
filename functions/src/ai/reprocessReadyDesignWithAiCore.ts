import { FieldValue } from "firebase-admin/firestore";

export type OwnerReadyAiReprocessEligibility =
  | { ok: true }
  | { ok: false; code: "not_ready" | "already_processing" | "archived"; message: string };

/**
 * Ready Design Library eligibility for owner "Reprocess with AI".
 */
export function assertReadyDesignEligibleForOwnerAiReprocess(
  design: Record<string, unknown>,
): OwnerReadyAiReprocessEligibility {
  if (design.status === "archived") {
    return {
      ok: false,
      code: "archived",
      message: "Archived designs cannot be reprocessed with AI.",
    };
  }

  if (design.status === "imported" && design.aiReviewStatus === "pending") {
    return {
      ok: false,
      code: "already_processing",
      message: "Design is already in AI Processing.",
    };
  }

  if (design.status === "processing") {
    return {
      ok: false,
      code: "already_processing",
      message: "Design is already in AI Processing.",
    };
  }

  if (design.status !== "ready" || design.aiReviewStatus !== "approved") {
    return {
      ok: false,
      code: "not_ready",
      message: "Only Ready approved designs can be reprocessed with AI.",
    };
  }

  return { ok: true };
}

/**
 * Demotion payload for Ready → AI Processing.
 * Retains root title/description/categoryId, readyAt, smartProfile, presets, artwork, Halftone/bg.
 * Clears AI suggestion/analysis blobs and review actor fields (same spirit as reset, without SP wipe).
 */
export function buildOwnerReadyAiReprocessDemotionUpdate(input: {
  callerUid: string;
  /** Prefer FieldValue.serverTimestamp() from Admin SDK. */
  now: ReturnType<typeof FieldValue.serverTimestamp>;
}): Record<string, unknown> {
  return {
    status: "imported",
    aiReviewStatus: "pending",
    aiProcessed: false,
    aiReviewed: false,
    aiProcessingStage: "queued",
    aiRequestedVisionModelId: FieldValue.delete(),
    aiRequestedReasoningEffort: FieldValue.delete(),
    aiSuggestions: FieldValue.delete(),
    aiAnalysis: FieldValue.delete(),
    // Keep smartProfile + smartProfileImportPresets + readyAt + roots (not listed = untouched)
    aiReviewedAt: FieldValue.delete(),
    aiReviewedBy: FieldValue.delete(),
    aiReviewNotes: FieldValue.delete(),
    aiReviewConfidence: FieldValue.delete(),
    lastOwnerAiReprocessAt: input.now,
    lastOwnerAiReprocessBy: input.callerUid,
    updatedAt: input.now,
    updatedBy: input.callerUid,
  };
}

/** Fields that must never appear in the demotion payload. */
export const OWNER_READY_AI_REPROCESS_PRESERVED_FIELD_KEYS = [
  "title",
  "description",
  "categoryId",
  "tags",
  "smartProfile",
  "smartProfileImportPresets",
  "smartProfileAiSnapshot",
  "readyAt",
  "artworkBackgroundHex",
  "artworkBackgroundSource",
  "halftoneStaffDecision",
  "halftoneDecisionSource",
  "halftoneSubmitterResponse",
  "previewPath",
  "thumbnailPath",
  "artworkPath",
  "printWidthInches",
  "printHeightInches",
  "companionDesignIds",
  "companionSetIncomplete",
  "isExplicitContent",
  "censoredTerms",
  "queueCount",
  "requestCount",
  "showAddCount",
  "printCount",
  "favoriteCount",
  "uploadedBy",
  "createdBy",
  "createdAt",
] as const;
