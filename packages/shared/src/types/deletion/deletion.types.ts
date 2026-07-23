import type { Timestamp } from "firebase/firestore";

/** Machine-readable deletion outcome for Studio/Portal UIs. */
export type DeletionOutcomeKind =
  | "allowed_hard_delete"
  | "tombstone"
  | "archive"
  | "blocked"
  | "failed"
  | "already_done";

export type CustomerAccountDeletionSource = "studio_owner" | "portal_request";

export interface DeletionBlocker {
  /** Stable code for tests and branching (not shown raw to end users). */
  code: string;
  /** User-safe summary. */
  message: string;
  /** Optional count of blocking records. */
  count?: number;
  /** Optional display names / labels (never raw internal stack traces). */
  labels?: string[];
  /** Optional Studio route hint when supported. */
  navigateHint?: string;
}

export interface DeletionImpactPreview {
  outcome: DeletionOutcomeKind;
  blockers: DeletionBlocker[];
  /** Short entity label for confirm copy. */
  entityLabel: string;
  /** Confirm button label when allowed. */
  confirmLabel?: string;
  /** Extra notes for the confirmation dialog. */
  notes?: string[];
}

export interface DeletionExecuteResult {
  outcome: DeletionOutcomeKind;
  blockers?: DeletionBlocker[];
  message: string;
  /** Entity id acted on. */
  entityId: string;
}

export const TOMBSTONE_CUSTOMER_CONFIRMATION_PHRASE = "DISABLE CUSTOMER";

export interface PreviewCustomerAccountDeletionRequest {
  customerId: string;
}

export interface PreviewCustomerAccountDeletionResponse extends DeletionImpactPreview {
  customerId: string;
  username: string | null;
  displayName: string;
  hasAuthAccount: boolean;
  openRequestCount: number;
  historicalRequestCount: number;
  alreadyDeleted: boolean;
}

export interface TombstoneCustomerAccountRequest {
  customerId: string;
  confirmationPhrase: string;
}

export interface TombstoneCustomerAccountResponse extends DeletionExecuteResult {
  customerId: string;
  authUidDisabled: string | null;
  authDisableFailed: boolean;
  username: string | null;
}

/** Fields written onto customers/{id} (and mirrored onto users when Auth-backed). */
export interface CustomerTombstoneFields {
  isDeleted: true;
  deletedAt: Timestamp;
  deletedBy: string;
  deletionSource: CustomerAccountDeletionSource;
}

export const DELETE_PRINT_REQUEST_CONFIRMATION_PHRASE = "DELETE REQUEST";

export interface PreviewPrintRequestDeletionRequest {
  printRequestId: string;
}

export interface PreviewPrintRequestDeletionResponse extends DeletionImpactPreview {
  printRequestId: string;
  printRequestName: string;
  itemCount: number;
  allocationCount: number;
}

export interface DeleteEligiblePrintRequestRequest {
  printRequestId: string;
  confirmationPhrase: string;
}

export interface DeleteEligiblePrintRequestResponse extends DeletionExecuteResult {
  printRequestId: string;
  deletedItemCount: number;
}

export const ARCHIVE_PRINT_REQUEST_CONFIRMATION_PHRASE = "ARCHIVE REQUEST";

export interface ArchivePrintRequestRequest {
  printRequestId: string;
  confirmationPhrase: string;
}

export interface ArchivePrintRequestResponse extends DeletionExecuteResult {
  printRequestId: string;
}

export const DELETE_UPCOMING_SHOW_CONFIRMATION_PHRASE = "DELETE SHOW";

export interface PreviewUpcomingShowDeletionRequest {
  upcomingShowId: string;
}

export interface PreviewUpcomingShowDeletionResponse extends DeletionImpactPreview {
  upcomingShowId: string;
  showLabel: string;
  allocationCount: number;
}

export interface DeleteEligibleUpcomingShowRequest {
  upcomingShowId: string;
  confirmationPhrase: string;
}

export interface DeleteEligibleUpcomingShowResponse extends DeletionExecuteResult {
  upcomingShowId: string;
}

export const DELETE_CUSTOMER_UPLOAD_CONFIRMATION_PHRASE = "DELETE UPLOAD";

export interface PreviewCustomerUploadDeletionRequest {
  customerUploadId: string;
}

export interface PreviewCustomerUploadDeletionResponse extends DeletionImpactPreview {
  customerUploadId: string;
  title: string;
}

export interface DeleteEligibleCustomerUploadRequest {
  customerUploadId: string;
  confirmationPhrase: string;
}

export interface DeleteEligibleCustomerUploadResponse extends DeletionExecuteResult {
  customerUploadId: string;
  storageFilesDeleted: number;
  storageCleanupFailed: boolean;
}

export interface PreviewCategoryArchiveRequest {
  categoryId: string;
}

export interface PreviewCategoryArchiveResponse extends DeletionImpactPreview {
  categoryId: string;
  categoryName: string;
  referencingDesignCount: number;
}

export interface ArchiveCategoryWithGuardsRequest {
  categoryId: string;
}

export interface ArchiveCategoryWithGuardsResponse extends DeletionExecuteResult {
  categoryId: string;
}

export interface PreviewTagArchiveRequest {
  tagId: string;
}

export interface PreviewTagArchiveResponse extends DeletionImpactPreview {
  tagId: string;
  tagName: string;
  referencingDesignCount: number;
}

export interface ArchiveTagWithGuardsRequest {
  tagId: string;
}

export interface ArchiveTagWithGuardsResponse extends DeletionExecuteResult {
  tagId: string;
}

/** Item production statuses that forbid hard-deleting a print request. */
export const PRINT_REQUEST_ITEM_STATUSES_BLOCKING_HARD_DELETE = [
  "queued",
  "in_progress",
  "printed",
  "done",
] as const;

export type PrintRequestItemStatusBlockingHardDelete =
  (typeof PRINT_REQUEST_ITEM_STATUSES_BLOCKING_HARD_DELETE)[number];

/** Show production statuses that forbid hard-deleting a show. */
export const SHOW_PRODUCTION_STATUSES_BLOCKING_HARD_DELETE = [
  "printing",
  "fully_printed",
  "completed",
  "archived",
] as const;
