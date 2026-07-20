import type { Timestamp } from "firebase/firestore";

export type AccountDeletionRequestStatus = "pending" | "cancelled" | "fulfilled";

export interface CustomerAccountDeletionRequestMirror {
  status: AccountDeletionRequestStatus;
  requestedAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SyncPortalAccountEmailResponse {
  email: string;
  synced: boolean;
  unchanged: boolean;
}

export interface RequestPortalAccountDeletionRequest {
  /** Must equal DELETE (case-insensitive) after trim. */
  confirmation: string;
}

export interface RequestPortalAccountDeletionResponse {
  status: "pending";
  alreadyPending: boolean;
}

export interface CancelPortalAccountDeletionRequestResponse {
  status: "cancelled" | "none";
}

export const OWNER_DELETE_USER_CONFIRMATION_PHRASE = "DELETE USER";

export type OwnerDeleteUserSubjectKind = "staff" | "customer";

export interface OwnerDeleteUserRequest {
  kind: OwnerDeleteUserSubjectKind;
  /** Staff: Auth/users uid. Customer: customers/{id}. */
  subjectId: string;
  confirmationPhrase: string;
}

export interface OwnerDeleteUserResponse {
  projectId: string;
  kind: OwnerDeleteUserSubjectKind;
  subjectId: string;
  authUidDeleted: string | null;
  deleted: Record<string, number>;
  storageFilesDeleted: number;
}
