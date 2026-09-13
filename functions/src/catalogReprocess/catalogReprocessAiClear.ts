import { FieldValue } from "firebase-admin/firestore";

/**
 * Operational staging for Catalog Reprocess work units (AI Review Queue).
 * Preserves the last successful AI result and review audit until guarded success; only the
 * processing lifecycle and transient request fields are changed here.
 *
 * Sets review to pending + stage queued so `runAiEnrichmentPipeline` queue mode will accept the design.
 *
 * Do NOT use for Ready Catalog — use `buildReadyCatalogReprocessAiStageUpdate` instead.
 */
export function buildCatalogReprocessAiClearUpdate(attemptId: string): Record<string, unknown> {
  return {
    status: "imported",
    aiReviewStatus: "pending",
    aiProcessed: false,
    aiReviewed: false,
    aiProcessingAttemptId: attemptId,
    aiProcessingStage: "queued",
    aiProcessingError: FieldValue.delete(),
    aiRequestedVisionModelId: FieldValue.delete(),
    aiRequestedReasoningEffort: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

/**
 * Ready Catalog backfill staging — preserves ready+approved lifecycle on every write.
 * Does not delete smartProfile early; success path replaces it atomically to avoid Algolia thinning.
 */
export function buildReadyCatalogReprocessAiStageUpdate(attemptId: string): Record<string, unknown> {
  return {
    aiProcessingAttemptId: attemptId,
    aiProcessingStage: "queued",
    aiProcessingError: FieldValue.delete(),
    aiProcessed: false,
    aiRequestedVisionModelId: FieldValue.delete(),
    aiRequestedReasoningEffort: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

/** Fields that must never appear in the AI clear payload (preservation contract). */
export const CATALOG_REPROCESS_PRESERVED_FIELD_KEYS = [
  "title",
  "description",
  "categoryId",
  "tags",
  "artworkBackgroundHex",
  "artworkBackgroundSource",
  "halftoneStaffDecision",
  "halftoneDecisionSource",
  "halftoneSubmitterResponse",
  "isExplicitContent",
  "censoredTerms",
  "companionDesignIds",
  "companionSetIncomplete",
  "previewPath",
  "thumbnailPath",
  "artworkPath",
  "printWidthInches",
  "printHeightInches",
  "queueCount",
  "requestCount",
  "showAddCount",
  "printCount",
  "favoriteCount",
  "uploadedBy",
  "createdBy",
  "createdAt",
] as const;

/** Ready backfill must never mutate lifecycle or human approval audit via staging. */
export const READY_CATALOG_REPROCESS_PRESERVED_LIFECYCLE_KEYS = [
  "status",
  "aiReviewStatus",
  "aiReviewed",
  "aiReviewedAt",
  "aiReviewedBy",
  "readyAt",
  "aiReviewNotes",
] as const;

export function assertReadyStageDoesNotTouchLifecycleFields(
  update: Record<string, unknown>,
): string[] {
  return READY_CATALOG_REPROCESS_PRESERVED_LIFECYCLE_KEYS.filter((key) =>
    Object.prototype.hasOwnProperty.call(update, key),
  );
}

export function assertAiClearDoesNotTouchPreservedFields(
  update: Record<string, unknown>,
): string[] {
  return CATALOG_REPROCESS_PRESERVED_FIELD_KEYS.filter((key) =>
    Object.prototype.hasOwnProperty.call(update, key),
  );
}
