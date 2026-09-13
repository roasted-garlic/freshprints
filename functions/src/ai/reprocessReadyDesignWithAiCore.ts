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
 * Retains root title/description/categoryId, Smart Profile, presets, artwork, and Halftone/bg.
 * Leaves `readyAt` untouched while demoted (design is out of Ready browse); Studio approval
 * restamps `readyAt` on the next non-ready → ready transition so Library/Portal sort newest.
 * Stages only the operational processing state; current AI output and review audit remain
 * available until the guarded success reconciliation.
 *
 * When `autoStart` is true (default), stage is `queued` for immediate pipeline.
 * When false, delete stage so the design is Start-AI-eligible (`not_generated`).
 */
export function buildOwnerReadyAiReprocessDemotionUpdate(input: {
  callerUid: string;
  attemptId: string;
  /** Prefer FieldValue.serverTimestamp() from Admin SDK. */
  now: ReturnType<typeof FieldValue.serverTimestamp>;
  /** When false, demote only — leave awaiting Start AI. Default true. */
  autoStart?: boolean;
}): Record<string, unknown> {
  const autoStart = input.autoStart !== false;

  return {
    status: "imported",
    aiReviewStatus: "pending",
    aiProcessed: false,
    aiReviewed: false,
    aiProcessingAttemptId: input.attemptId,
    aiProcessingStage: autoStart ? "queued" : FieldValue.delete(),
    aiProcessingError: FieldValue.delete(),
    aiRequestedVisionModelId: FieldValue.delete(),
    aiRequestedReasoningEffort: FieldValue.delete(),
    // Keep smartProfile + smartProfileImportPresets + roots (not listed = untouched).
    // readyAt is left in place while demoted; Studio approval restamps on Ready re-entry.
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
