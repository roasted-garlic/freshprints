import type { CustomerUploadCatalogPermissionFollowUpStatus } from "./customerUpload.enums";

export const CUSTOMER_UPLOAD_PERMISSION_ACTIVITY_KINDS = [
  "initial_denial",
  "ask_sent",
  "customer_allow",
  "customer_decline",
] as const;

export type CustomerUploadPermissionActivityKind =
  (typeof CUSTOMER_UPLOAD_PERMISSION_ACTIVITY_KINDS)[number];

export interface CustomerUploadPermissionActivityEntry {
  id: string;
  kind: CustomerUploadPermissionActivityKind;
  /** 1-based Ask Again attempt for ask_sent / customer_* kinds. */
  attempt?: 1 | 2;
  at?: unknown;
  byUid?: string | null;
}

export interface RequestCustomerUploadCatalogPermissionFollowUpRequest {
  uploadId: string;
}

export interface RequestCustomerUploadCatalogPermissionFollowUpResponse {
  uploadId: string;
  status: "requested";
  requestToken: string;
  notificationId: string;
}

export interface GetCustomerUploadCatalogPermissionFollowUpRequest {
  requestToken: string;
}

export interface GetCustomerUploadCatalogPermissionFollowUpResponse {
  status: CustomerUploadCatalogPermissionFollowUpStatus;
  originalFilename: string;
  /** Signed or client-resolved preview URL when available. */
  previewUrl: string | null;
  /**
   * Storage path for the customer-owned preview/thumbnail. Portal resolves this with
   * client `getDownloadURL` (faster than Admin signed URLs on cold Functions).
   */
  previewStoragePath?: string | null;
  /**
   * Resolved CSS mat for the preview (detector dark, Studio staff choice, or default grey).
   */
  previewBackgroundHex?: string;
  printRequestName: string | null;
  printRequestId: string;
}

export interface RespondToCustomerUploadCatalogPermissionFollowUpRequest {
  requestToken: string;
  decision: "allow" | "decline";
}

export interface RespondToCustomerUploadCatalogPermissionFollowUpResponse {
  decision: "allow" | "decline";
  catalogReviewStatus: "pending_staff_review" | "excluded_from_catalog";
  followUpStatus: "approved" | "declined";
}
