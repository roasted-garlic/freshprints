import type { Timestamp } from "firebase/firestore";

export const USERNAME_HISTORY_MAX_ENTRIES = 10;
export const PORTAL_USERNAME_CHANGE_COOLDOWN_DAYS = 30;
export const PORTAL_USERNAME_CHANGE_COOLDOWN_MS =
  PORTAL_USERNAME_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

export interface CustomerUsernameHistoryEntry {
  /** Previous username at the time of change. */
  username: string;
  changedAt: Timestamp;
}

export type CustomerIdentitySnapshotPropagationStatus =
  | "idle"
  | "in_progress"
  | "completed"
  | "failed";

export interface CustomerIdentitySnapshotPropagationState {
  status: CustomerIdentitySnapshotPropagationStatus;
  targetUsername: string;
  targetDisplayName: string;
  printRequestCursor?: string | null;
  designIssueReportCursor?: string | null;
  stage?: "printRequests" | "designIssueReports";
  printRequestsUpdated: number;
  designIssueReportsUpdated: number;
  startedAt: Timestamp;
  updatedAt: Timestamp;
  lastError?: string;
}

export type CustomerIdentityOperationLockKind =
  | "hard_delete"
  | "disable"
  | "merge"
  | "username_transfer";

export interface CustomerIdentityOperationLock {
  kind: CustomerIdentityOperationLockKind;
  lockedAt: Timestamp;
  lockedBy: string;
  previewChecksum?: string;
}
