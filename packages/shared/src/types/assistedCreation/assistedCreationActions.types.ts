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
  | "restore";

export interface StaffUpdateAssistedCreationStatusRequest {
  requestId: string;
  action: StaffAssistedCreationStatusAction;
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

/** Payload shape accepted by submit after client builds answers. */
export type SubmitAssistedCreationAnswers = AssistedCreationAnswers;
