import type { CustomerUploadCatalogPermissionFollowUpStatus } from "./customerUpload.enums";

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
  previewUrl: string | null;
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
