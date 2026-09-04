export const CATALOG_REPROCESS_JOBS_COLLECTION = "catalogReprocessJobs" as const;
export const CATALOG_REPROCESS_OUTCOMES_SUBCOLLECTION = "outcomes" as const;

export const CATALOG_REPROCESS_TARGET_TYPES = ["ai_review_queue", "ready_catalog"] as const;

export type CatalogReprocessTargetType = (typeof CATALOG_REPROCESS_TARGET_TYPES)[number];

export const CATALOG_REPROCESS_JOB_STATUSES = [
  "pending",
  "running",
  "paused",
  "completed",
  "failed",
  "cancelled",
] as const;

export type CatalogReprocessJobStatus = (typeof CATALOG_REPROCESS_JOB_STATUSES)[number];

export const CATALOG_REPROCESS_OUTCOME_STATUSES = [
  "succeeded",
  "failed",
  "skipped_ineligible",
  "anomaly",
] as const;

export type CatalogReprocessOutcomeStatus = (typeof CATALOG_REPROCESS_OUTCOME_STATUSES)[number];

/** Slice 5 unlocks AI Review Queue Start; Slice 6 unlocks Ready Catalog (DEV). */
export const CATALOG_REPROCESS_AI_REVIEW_QUEUE_ENABLED = true;
export const CATALOG_REPROCESS_READY_CATALOG_ENABLED = true;

export const CATALOG_REPROCESS_MAX_ATTEMPTS = 5;
export const CATALOG_REPROCESS_LEASE_MS = 2 * 60 * 1000;
/** One enrichment per worker claim — Gemini path may approach callable timeout. */
export const CATALOG_REPROCESS_DESIGNS_PER_CLAIM = 1;
export const CATALOG_REPROCESS_PREVIEW_PAGE_SIZE = 200;
/** Max explicit Ready design IDs for a bounded canary/full job Start. */
export const CATALOG_REPROCESS_BOUNDED_DESIGN_IDS_MAX = 50;

/** Max canary IDs recommended per owner QA (enforced as warning in UI; server caps at BOUNDED max). */
export const CATALOG_REPROCESS_CANARY_DESIGN_IDS_RECOMMENDED_MAX = 10;

export const REPROCESS_AI_REVIEW_QUEUE_CONFIRMATION_PHRASE = "REPROCESS AI REVIEW QUEUE" as const;
export const REPROCESS_READY_CATALOG_CONFIRMATION_PHRASE = "REPROCESS READY CATALOG" as const;
export const REPROCESS_PRODUCTION_AI_REVIEW_CONFIRMATION_PHRASE =
  "REPROCESS PRODUCTION AI REVIEW" as const;
export const REPROCESS_PRODUCTION_READY_CATALOG_CONFIRMATION_PHRASE =
  "REPROCESS PRODUCTION READY CATALOG" as const;

/** Snapshot labels recorded on jobs at Start (must match live DEV pipeline). */
export const CATALOG_REPROCESS_PROMPT_VERSION_SNAPSHOT = "catalog-enrich-v34" as const;
export const CATALOG_REPROCESS_NORMALIZER_VERSION_SNAPSHOT =
  "smart-profile-normalizer-v6" as const;

export function isCatalogReprocessTargetType(value: unknown): value is CatalogReprocessTargetType {
  return (
    typeof value === "string" &&
    (CATALOG_REPROCESS_TARGET_TYPES as readonly string[]).includes(value)
  );
}

export function isCatalogReprocessTargetEnabled(targetType: CatalogReprocessTargetType): boolean {
  if (targetType === "ai_review_queue") {
    return CATALOG_REPROCESS_AI_REVIEW_QUEUE_ENABLED;
  }
  return CATALOG_REPROCESS_READY_CATALOG_ENABLED;
}

export function resolveCatalogReprocessConfirmationPhrase(input: {
  targetType: CatalogReprocessTargetType;
  isProduction: boolean;
}): string {
  if (input.targetType === "ai_review_queue") {
    return input.isProduction
      ? REPROCESS_PRODUCTION_AI_REVIEW_CONFIRMATION_PHRASE
      : REPROCESS_AI_REVIEW_QUEUE_CONFIRMATION_PHRASE;
  }
  return input.isProduction
    ? REPROCESS_PRODUCTION_READY_CATALOG_CONFIRMATION_PHRASE
    : REPROCESS_READY_CATALOG_CONFIRMATION_PHRASE;
}

export function catalogReprocessTargetLabel(targetType: CatalogReprocessTargetType): string {
  return targetType === "ai_review_queue" ? "AI Review Queue" : "Ready Catalog";
}

export function catalogReprocessUnavailableReason(targetType: CatalogReprocessTargetType): string {
  if (targetType === "ai_review_queue") {
    return "Reprocess AI Review Queue unlocks in Slice 5 after that migration is authorized.";
  }
  return "Reprocess Ready Catalog unlocks in Slice 6 after that migration is authorized.";
}

/** Canonical AI Review Queue eligibility (shared preview + worker). */
export function isAiReviewQueueEligibleDesign(input: {
  status?: unknown;
  aiReviewStatus?: unknown;
}): boolean {
  return input.status === "imported" && input.aiReviewStatus === "needs_review";
}

/** Canonical Ready Catalog eligibility (Slice 6 preview + worker). */
export function isReadyCatalogEligibleDesign(input: {
  status?: unknown;
  aiReviewStatus?: unknown;
}): boolean {
  return input.status === "ready" && input.aiReviewStatus === "approved";
}
