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

export interface StaffAddAssistedCreationProofRequest {
  requestId: string;
  proof: {
    id: string;
    storagePath: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
    note?: string;
  };
}

export interface StaffAddAssistedCreationProofResponse {
  requestId: string;
  status: "proof_ready";
  proofId: string;
}

/** Customer: mint a short-lived signed URL for the approved proof full-res download. */
export interface CustomerGetAssistedCreationApprovedProofDownloadUrlRequest {
  requestId: string;
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
}

export interface CustomerGetAssistedCreationApprovedProofFileResponse {
  fileName: string;
  contentType: string;
  /** Raw file bytes, base64-encoded. */
  contentBase64: string;
  /** Epoch ms when the 14-day retention download window ends; null for legacy approvals. */
  downloadExpiresAtMillis: number | null;
}

/** Payload shape accepted by submit after client builds answers. */
export type SubmitAssistedCreationAnswers = AssistedCreationAnswers;
