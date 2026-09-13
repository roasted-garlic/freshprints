import type { AssistedCreationAnswers } from "./assistedCreation.types";
import type { AssistedCreationStatus } from "../../constants/assistedCreation/assistedCreation.constants";

export interface SubmitAssistedCreationRequestRequest {
  answers: unknown;
  /** Client-uploaded reference image metadata (paths must be under the caller's pending prefix). */
  referenceImages?: Array<{
    id: string;
    storagePath: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
  }>;
}

export interface SubmitAssistedCreationRequestResponse {
  requestId: string;
}

export interface CancelAssistedCreationRequestRequest {
  requestId: string;
  /** Required customer-facing cancel reason (trimmed; server-validated). */
  reason: string;
}

export interface CancelAssistedCreationRequestResponse {
  requestId: string;
  status: "cancelled";
}

/**
 * Customer may update answers / references only while status is `submitted`.
 * `referenceImages` is a full replacement list when provided (omit to keep existing).
 */
export interface CustomerUpdateAssistedCreationRequestRequest {
  requestId: string;
  answers: unknown;
  referenceImages?: Array<{
    id: string;
    storagePath: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
  }>;
  /** Optional note describing what changed (stored in revision history). */
  updateNote?: string;
}

export interface CustomerUpdateAssistedCreationRequestResponse {
  requestId: string;
  status: "submitted";
}

export interface CustomerSendAssistedCreationMessageRequest {
  requestId: string;
  message: string;
}

export interface CustomerSendAssistedCreationMessageResponse {
  requestId: string;
  status: AssistedCreationStatus;
}

export interface StaffSendAssistedCreationMessageRequest {
  requestId: string;
  message: string;
}

export interface StaffSendAssistedCreationMessageResponse {
  requestId: string;
  status: AssistedCreationStatus;
}

export type CustomerAssistedCreationProofDecision = "approve" | "request_revision";

export interface CustomerRespondToAssistedCreationProofRequest {
  requestId: string;
  decision: CustomerAssistedCreationProofDecision;
  /** Required when decision is request_revision; optional short note when approving. */
  note?: string;
  /** Optional 1–5 star rating when decision is approve. */
  rating?: number;
  /**
   * Active proof round id. Required for multi-option rounds; optional for legacy /
   * one-option rounds (server may infer the sole current option).
   */
  proofRoundId?: string;
  /**
   * Selected option proof id. Required for multi-option rounds; optional when the
   * current round has exactly one option.
   */
  selectedProofId?: string;
}

export interface CustomerRespondToAssistedCreationProofResponse {
  requestId: string;
  status: AssistedCreationStatus;
}

export type StaffAssistedCreationStatusAction =
  | "start_work"
  | "resume_work"
  | "reject"
  | "cancel"
  | "restore"
  /** Persist internal staff notes without changing status or revision history. */
  | "update_notes";

export interface StaffUpdateAssistedCreationStatusRequest {
  requestId: string;
  action: StaffAssistedCreationStatusAction;
  /**
   * Optional on status transitions (applied when provided).
   * For `update_notes`, trimmed value is written (empty clears notes).
   */
  staffNotes?: string;
  /** Required for reject, cancel, and restore. */
  reason?: string;
}

export interface StaffUpdateAssistedCreationStatusResponse {
  requestId: string;
  status: AssistedCreationStatus;
}

export interface StaffAssistedCreationProofInput {
  id: string;
  storagePath: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  note?: string;
}

export interface StaffAddAssistedCreationProofRequest {
  requestId: string;
  /**
   * Legacy singular proof. Normalized to a one-entry `proofs` list when `proofs` is omitted.
   * Prefer `proofs` for multi-option rounds.
   */
  proof?: StaffAssistedCreationProofInput;
  /**
   * Ordered batch of proof options for one round (1..N). Server assigns round id,
   * optionOrder, and Option A/B/C labels from this order.
   */
  proofs?: StaffAssistedCreationProofInput[];
}

export interface StaffAddAssistedCreationProofResponse {
  requestId: string;
  status: "proof_ready";
  /** First / only proof id (legacy callers). */
  proofId: string;
  /** Server-owned round id for this attach. */
  proofRoundId: string;
  /** All attached proof ids in option order. */
  proofIds: string[];
}

/** Staff: upload final HR artwork and complete (`final_source_needed` → `approved`). */
export interface StaffAddAssistedCreationFinalSourceRequest {
  requestId: string;
  finalSource: {
    id: string;
    storagePath: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
  };
}

export interface StaffAddAssistedCreationFinalSourceResponse {
  requestId: string;
  status: "approved";
  finalSourceId: string;
}

/** Staff: suggest a ready catalog design instead of uploading a custom proof. */
export interface StaffSuggestAssistedCreationCatalogDesignRequest {
  requestId: string;
  designId: string;
  /** Optional note shown in revision history / customer context. */
  note?: string;
}

export interface StaffSuggestAssistedCreationCatalogDesignResponse {
  requestId: string;
  status: "proof_ready";
  designId: string;
}

/** Customer: mint a short-lived signed URL for the approved proof full-res download. */
export interface CustomerGetAssistedCreationApprovedProofDownloadUrlRequest {
  requestId: string;
  /** Omit for legacy auto (finalSource when present, else approved proof). */
  downloadTarget?: "final_artwork" | "approved_proof";
}

export interface CustomerGetAssistedCreationApprovedProofDownloadUrlResponse {
  downloadUrl: string;
  fileName: string;
  contentType: string;
  /** Epoch ms when the signed URL expires (not the 14-day retention window). */
  urlExpiresAtMillis: number;
  /** Epoch ms when the 14-day retention download window ends; null for legacy approvals. */
  downloadExpiresAtMillis: number | null;
}

/** Customer: Admin-streamed proof bytes for reliable Portal file download (no GCS navigate / CORS fetch). */
export interface CustomerGetAssistedCreationApprovedProofFileRequest {
  requestId: string;
  downloadTarget?: "final_artwork" | "approved_proof";
}

export interface CustomerGetAssistedCreationApprovedProofFileResponse {
  fileName: string;
  contentType: string;
  /** Raw file bytes, base64-encoded. */
  contentBase64: string;
  /** Epoch ms when the 14-day retention download window ends; null for legacy approvals. */
  downloadExpiresAtMillis: number | null;
}

/** Customer: copy approved Assisted proof into Stash (working print request) as a private upload. */
export interface CustomerAddAssistedApprovedProofToPrintRequestRequest {
  requestId: string;
  /**
   * Customer consent for Design Library consideration.
   * true → upload eligible for Studio intake (`pending_staff_review`); false → private only.
   * Does not auto-publish to catalog.
   */
  catalogUseAcknowledged: boolean;
}

export interface CustomerAddAssistedApprovedProofToPrintRequestResponse {
  printRequestId: string;
  printRequestItemId: string;
  customerUploadId: string;
  /** True when an existing Stash line was returned (no duplicate created). */
  alreadyAttached: boolean;
}

/** Payload shape accepted by submit after client builds answers. */
export type SubmitAssistedCreationAnswers = AssistedCreationAnswers;
