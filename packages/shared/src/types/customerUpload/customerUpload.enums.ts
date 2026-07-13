/** Technical processing status for a customer upload (independent of catalog intake). */
export type CustomerUploadTechnicalStatus =
  | "awaiting_upload"
  | "uploading"
  | "validating"
  | "processing"
  | "ready"
  | "failed";

/**
 * Fine-grained progress inside validating/processing (written by finalize callables).
 * Cleared when the upload reaches ready or failed.
 */
export type CustomerUploadTechnicalProgressStage =
  | "reading_upload"
  | "discovered"
  | "checking_format"
  | "checking_transparency"
  | "converting_format"
  | "trimming"
  | "upscaling"
  | "preparing_artwork"
  | "checking_print_size"
  | "creating_previews"
  | "saving";

/**
 * Catalog intake status for a customer upload.
 * Promotion linkage uses `promotedDesignId` — there is no `promoted_to_design` status.
 */
export type CustomerUploadCatalogReviewStatus =
  | "not_eligible"
  | "pending_staff_review"
  | "sent_to_ai_review"
  | "excluded_from_catalog";

export type CustomerUploadBatchStatus = "open" | "confirmed" | "abandoned" | "failed";

export type CustomerUploadSourceFormat = "png" | "webp";

/** Machine-readable technical failure codes (user-safe messages mapped separately). */
export type CustomerUploadTechnicalFailureCode =
  | "unsupported_format"
  | "background_not_transparent"
  | "could_not_decode"
  | "transparency_check_failed"
  | "image_exceeds_limits"
  | "archive_exceeds_limits"
  | "nested_archive_rejected"
  | "processing_failed"
  | "upload_missing"
  | "path_mismatch"
  | "animated_rejected";
