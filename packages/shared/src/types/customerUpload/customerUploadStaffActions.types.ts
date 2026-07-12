/** Staff callable DTOs for customer-upload intake (Sub-phase E). */

export interface PromoteCustomerUploadToAiReviewRequest {
  uploadId: string;
}

export interface PromoteCustomerUploadToAiReviewResponse {
  uploadId: string;
  designId: string;
  alreadyPromoted: boolean;
  catalogReviewStatus: "sent_to_ai_review";
  originalPath: string;
  enqueueAttempted: boolean;
  enqueueQueued: boolean;
  enqueueReason?: string | null;
}

export interface ExcludeCustomerUploadFromCatalogRequest {
  uploadId: string;
}

export interface ExcludeCustomerUploadFromCatalogResponse {
  uploadId: string;
  catalogReviewStatus: "excluded_from_catalog";
}

export interface RestoreCustomerUploadCatalogEligibilityRequest {
  uploadId: string;
}

export interface RestoreCustomerUploadCatalogEligibilityResponse {
  uploadId: string;
  catalogReviewStatus: "pending_staff_review";
}

export interface RetryCustomerUploadProcessingRequest {
  uploadId: string;
}

export interface RetryCustomerUploadProcessingResponse {
  uploadId: string;
  batchId: string;
  technicalStatus: "ready" | "failed";
  technicalFailureCode?: string | null;
  technicalFailureMessage?: string | null;
}
