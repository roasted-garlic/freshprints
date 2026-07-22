import type { CustomerNotificationKind } from "../types/customerNotifications/customerNotifications.types";

const ASSISTED_STATUS_BASE = "/custom-designs?flow=assisted&step=status";

/** Portal Alerts titles — sentence case to match “Notification history” / staff toast titles. */
export const CUSTOMER_NOTIFICATION_TITLES = {
  assisted_staff_message: "New message",
  assisted_proof_ready: "New proof",
  assisted_catalog_share_ready: "Library design match",
} as const satisfies Record<CustomerNotificationKind, string>;

/** Fixed proof-alert body (do not use staff note here). */
export const CUSTOMER_NOTIFICATION_PROOF_BODY =
  "Review the latest proof for your request." as const;

/** Fixed catalog-share alert body. */
export const CUSTOMER_NOTIFICATION_CATALOG_SHARE_BODY =
  "We found a Library design that matches your request. Approve it or request changes with a short note." as const;

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

export function buildCustomerNotificationHref(kind: CustomerNotificationKind): string {
  if (kind === "assisted_proof_ready") {
    return buildAssistedProofReadyNotificationHref();
  }
  if (kind === "assisted_catalog_share_ready") {
    return buildAssistedCatalogShareReadyNotificationHref();
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

export function buildAssistedProofReadyNotificationId(requestId: string, proofId: string): string {
  return `proof_${requestId}_${proofId}`;
}

export function buildAssistedCatalogShareReadyNotificationId(
  requestId: string,
  designId: string,
): string {
  return `catalog_${requestId}_${designId}`;
}

export function buildAssistedStaffMessageNotificationId(
  requestId: string,
  atMillis: number,
): string {
  return `msg_${requestId}_${atMillis}`;
}
