import { FieldValue } from "firebase-admin/firestore";

/**
 * Reset-equivalent AI blob clear for Catalog Reprocess work units (AI Review Queue).
 * Mirrors `resetAiEnrichmentForProcessing` AI clears (including smartProfile + aiReviewNotes)
 * while preserving B/D catalog fields (title, tags, bg, halftone, companions, etc.).
 *
 * Sets review to pending + stage queued so `runAiEnrichmentPipeline` queue mode will accept the design.
 *
 * Do NOT use for Ready Catalog — use `buildReadyCatalogReprocessAiStageUpdate` instead.
 */
export function buildCatalogReprocessAiClearUpdate(): Record<string, unknown> {
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
    smartProfile: FieldValue.delete(),
    aiReviewedAt: FieldValue.delete(),
    aiReviewedBy: FieldValue.delete(),
    aiReviewNotes: FieldValue.delete(),
    aiReviewConfidence: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

/**
 * Ready Catalog backfill staging — preserves ready+approved lifecycle on every write.
 * Does not delete smartProfile early; success path replaces it atomically to avoid Algolia thinning.
 */
export function buildReadyCatalogReprocessAiStageUpdate(): Record<string, unknown> {
  return {
    aiProcessingStage: "queued",
    aiProcessed: false,
    aiRequestedVisionModelId: FieldValue.delete(),
    aiRequestedReasoningEffort: FieldValue.delete(),
    aiSuggestions: FieldValue.delete(),
    aiAnalysis: FieldValue.delete(),
    aiReviewConfidence: FieldValue.delete(),
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
