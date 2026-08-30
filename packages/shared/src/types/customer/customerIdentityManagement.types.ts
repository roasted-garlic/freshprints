import type { DeletionBlocker, DeletionImpactPreview } from "../deletion/deletion.types";

export type CustomerIdentityOperationLockKind =
  | "hard_delete"
  | "disable"
  | "merge"
  | "username_transfer";

export interface CustomerIdentityOperationLock {
  kind: CustomerIdentityOperationLockKind;
  lockedAt: import("firebase/firestore").Timestamp;
  lockedBy: string;
  previewChecksum?: string;
}

export interface PreviewHardDeleteCustomerAccountRequest {
  customerId: string;
}

export interface PreviewHardDeleteCustomerAccountResponse extends DeletionImpactPreview {
  customerId: string;
  previewId: string;
  previewChecksum: string;
  previewExpiresAtMillis: number;
  username: string | null;
  displayName: string;
  hasAuthAccount: boolean;
  blockerCounts: Record<string, number>;
  alreadyDeleted: boolean;
  isTombstoned: boolean;
  isDisabled: boolean;
  isMerged: boolean;
}

export interface HardDeleteCustomerAccountRequest {
  customerId: string;
  confirmationPhrase: string;
  previewId: string;
  previewChecksum: string;
}

export interface HardDeleteCustomerAccountResponse {
  outcome: "allowed_hard_delete" | "blocked" | "already_done";
  message: string;
  customerId: string;
  previewChecksum: string;
  authUidDeleted: string | null;
  usernameReleased: string | null;
  deleted: Record<string, number>;
  blockers?: DeletionBlocker[];
}

export interface DisableCustomerAccountRequest {
  customerId: string;
  reason?: string;
}

export interface DisableCustomerAccountResponse {
  outcome: "success" | "already_done" | "blocked";
  message: string;
  customerId: string;
  authUidDisabled: string | null;
  authDisableFailed: boolean;
}

export interface RestoreCustomerAccountRequest {
  customerId: string;
}

export interface RestoreCustomerAccountResponse {
  outcome: "success" | "already_done" | "blocked";
  message: string;
  customerId: string;
  authUidRestored: string | null;
  authRestoreFailed: boolean;
}
