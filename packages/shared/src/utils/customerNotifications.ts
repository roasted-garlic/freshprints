import type { CustomerNotificationKind } from "../types/customerNotifications/customerNotifications.types";

const ASSISTED_STATUS_BASE = "/custom-designs?flow=assisted&step=status";

/** Portal Alerts titles — sentence case to match “Notification history” / staff toast titles. */
export const CUSTOMER_NOTIFICATION_TITLES = {
  assisted_staff_message: "New message",
  assisted_proof_ready: "New proof",
  assisted_catalog_share_ready: "Library design match",
  assisted_final_artwork_ready: "Final artwork ready",
  customer_upload_catalog_permission_follow_up: "Permission to use your artwork",
} as const satisfies Record<CustomerNotificationKind, string>;

/** Fixed proof-alert body (do not use staff note here). */
export const CUSTOMER_NOTIFICATION_PROOF_BODY =
  "Review the latest proof for your request." as const;

/** Fixed catalog-share alert body. */
export const CUSTOMER_NOTIFICATION_CATALOG_SHARE_BODY =
  "We found a Library design that matches your request. Approve it or request changes with a short note." as const;

export const CUSTOMER_NOTIFICATION_FINAL_ARTWORK_BODY =
  "Your final artwork is ready to view, download, or add to a print request." as const;

export const CUSTOMER_NOTIFICATION_CUSTOMER_UPLOAD_PERMISSION_BODY =
  "Please review whether Fresh Prints may add your uploaded artwork to the shared Design Library." as const;

export function buildAssistedProofReadyNotificationHref(): string {
  return `${ASSISTED_STATUS_BASE}&detailTab=proofs`;
}

/** Catalog suggestion review lands on Overview (status card), not Proofs download. */
export function buildAssistedCatalogShareReadyNotificationHref(): string {
  return `${ASSISTED_STATUS_BASE}&detailTab=overview`;
}

export function buildAssistedStaffMessageNotificationHref(): string {
  return `${ASSISTED_STATUS_BASE}&detailTab=messages`;
}

export function buildCustomerUploadCatalogPermissionFollowUpNotificationHref(
  actionToken: string,
): string {
  return `/requests/artwork?permissionRequest=${encodeURIComponent(actionToken)}`;
}

export function buildCustomerNotificationHref(
  kind: CustomerNotificationKind,
  actionToken?: string,
): string {
  if (kind === "assisted_proof_ready") {
    return buildAssistedProofReadyNotificationHref();
  }
  if (kind === "assisted_catalog_share_ready" || kind === "assisted_final_artwork_ready") {
    return buildAssistedCatalogShareReadyNotificationHref();
  }
  if (kind === "customer_upload_catalog_permission_follow_up") {
    return buildCustomerUploadCatalogPermissionFollowUpNotificationHref(actionToken ?? "");
  }
  return buildAssistedStaffMessageNotificationHref();
}

export function buildCustomerNotificationTitle(kind: CustomerNotificationKind): string {
  return CUSTOMER_NOTIFICATION_TITLES[kind];
}

export function truncateCustomerNotificationBody(
  value: string | null | undefined,
  maxLength = 140,
): string {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) {
    return "You have a new update on your custom design request.";
  }
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

/** Missing / non-boolean means opted in (same model as proof email). */
export function isAssistedBrowserPushOptedIn(value: unknown): boolean {
  return value !== false;
}

export function buildAssistedProofReadyNotificationId(
  requestId: string,
  proofRoundId: string,
): string {
  return `proof_${requestId}_${proofRoundId}`;
}

export function buildAssistedCatalogShareReadyNotificationId(
  requestId: string,
  designId: string,
): string {
  return `catalog_${requestId}_${designId}`;
}

export function buildAssistedFinalArtworkReadyNotificationId(
  requestId: string,
  finalSourceId: string,
): string {
  return `final_${requestId}_${finalSourceId}`;
}

export function buildAssistedStaffMessageNotificationId(
  requestId: string,
  atMillis: number,
): string {
  return `msg_${requestId}_${atMillis}`;
}

/** Idempotent Alerts id for staff Ask Again catalog-permission follow-ups. */
export function buildCustomerUploadCatalogPermissionFollowUpNotificationId(
  actionToken: string,
): string {
  return `customer_upload_permission_${actionToken}`;
}

/**
 * Permission follow-ups stay in the Alerts dropdown until Allow/Decline.
 * Click / Mark all read must not clear them early.
 */
export function isCustomerNotificationStickyUntilResolved(
  kind: CustomerNotificationKind,
): boolean {
  return kind === "customer_upload_catalog_permission_follow_up";
}

/**
 * History always includes cleared alerts, plus open sticky permission requests
 * (even while they remain unread in the live dropdown), unless the customer
 * soft-cleared history for that row.
 */
export function isCustomerNotificationVisibleInHistory(item: {
  kind: CustomerNotificationKind;
  readAt: unknown | null;
  clearedFromHistoryAt?: unknown | null;
}): boolean {
  if (item.clearedFromHistoryAt != null) {
    return false;
  }
  return item.readAt != null || isCustomerNotificationStickyUntilResolved(item.kind);
}

/** Unanswered permission requests stay in Alerts + history through Clear history. */
export function isCustomerNotificationPreservedFromHistoryClear(item: {
  kind: CustomerNotificationKind;
  readAt: unknown | null;
}): boolean {
  return isCustomerNotificationStickyUntilResolved(item.kind) && item.readAt == null;
}
