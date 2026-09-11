import type { CustomerUploadCatalogPermissionFollowUpStatus } from "../types/customerUpload/customerUpload.enums";
import {
  CUSTOMER_UPLOAD_PERMISSION_ACTIVITY_KINDS,
  type CustomerUploadPermissionActivityEntry,
  type CustomerUploadPermissionActivityKind,
} from "../types/customerUpload/customerUploadCatalogPermission.types";

export type {
  CustomerUploadPermissionActivityEntry,
  CustomerUploadPermissionActivityKind,
} from "../types/customerUpload/customerUploadCatalogPermission.types";

/** Max staff Ask Again sends after the initial Don’t-allow. */
export const CUSTOMER_UPLOAD_PERMISSION_MAX_ASKS = 2 as const;

export function isCustomerUploadPermissionActivityKind(
  value: unknown,
): value is CustomerUploadPermissionActivityKind {
  return (
    typeof value === "string" &&
    (CUSTOMER_UPLOAD_PERMISSION_ACTIVITY_KINDS as readonly string[]).includes(value)
  );
}

/**
 * Completed Ask Again sends. Missing + declined (legacy one-ask) counts as 1 so staff
 * may send one more under the two-ask policy.
 */
export function resolveCustomerUploadPermissionAskCount(input: {
  catalogPermissionAskCount?: unknown;
  catalogPermissionFollowUpStatus?: unknown;
}): number {
  if (
    typeof input.catalogPermissionAskCount === "number" &&
    Number.isFinite(input.catalogPermissionAskCount)
  ) {
    return Math.max(0, Math.min(CUSTOMER_UPLOAD_PERMISSION_MAX_ASKS, Math.floor(input.catalogPermissionAskCount)));
  }
  if (input.catalogPermissionFollowUpStatus === "declined") {
    return 1;
  }
  if (
    input.catalogPermissionFollowUpStatus === "requested" ||
    input.catalogPermissionFollowUpStatus === "approved"
  ) {
    return 1;
  }
  return 0;
}

export function canRequestCustomerUploadPermissionFollowUp(input: {
  catalogReviewStatus?: unknown;
  catalogExclusionReason?: unknown;
  catalogPermissionFollowUpStatus?: unknown;
  catalogPermissionAskCount?: unknown;
}): boolean {
  if (input.catalogReviewStatus !== "excluded_from_catalog") {
    return false;
  }
  if (input.catalogExclusionReason !== "customer_permission_denied") {
    return false;
  }
  const status = input.catalogPermissionFollowUpStatus;
  if (status === "requested" || status === "approved") {
    return false;
  }
  const askCount = resolveCustomerUploadPermissionAskCount(input);
  return askCount < CUSTOMER_UPLOAD_PERMISSION_MAX_ASKS;
}

/** Second decline parks on Excluded (leaves actionable Denied). */
export function isTerminalCustomerUploadPermissionDenial(input: {
  catalogExclusionReason?: unknown;
  catalogPermissionFollowUpStatus?: unknown;
  catalogPermissionAskCount?: unknown;
}): boolean {
  if (input.catalogExclusionReason !== "customer_permission_denied") {
    return false;
  }
  if (input.catalogPermissionFollowUpStatus !== "declined") {
    return false;
  }
  return resolveCustomerUploadPermissionAskCount(input) >= CUSTOMER_UPLOAD_PERMISSION_MAX_ASKS;
}

export function buildCustomerUploadPermissionActivityId(
  kind: CustomerUploadPermissionActivityKind,
  attempt?: 1 | 2,
): string {
  if (kind === "initial_denial") {
    return "initial_denial";
  }
  return `${kind}_${attempt ?? 0}`;
}

export function normalizeCustomerUploadPermissionActivity(
  value: unknown,
): CustomerUploadPermissionActivityEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const entries: CustomerUploadPermissionActivityEntry[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") {
      continue;
    }
    const record = raw as Record<string, unknown>;
    if (!isCustomerUploadPermissionActivityKind(record.kind)) {
      continue;
    }
    const attempt =
      record.attempt === 1 || record.attempt === 2 ? record.attempt : undefined;
    const id =
      typeof record.id === "string" && record.id.trim()
        ? record.id.trim()
        : buildCustomerUploadPermissionActivityId(record.kind, attempt);
    entries.push({
      id,
      kind: record.kind,
      ...(attempt ? { attempt } : {}),
      at: record.at,
      byUid: typeof record.byUid === "string" ? record.byUid : null,
    });
  }
  return entries;
}

export function describeCustomerUploadPermissionActivity(
  entry: CustomerUploadPermissionActivityEntry,
): string {
  switch (entry.kind) {
    case "initial_denial":
      return "Initial Don’t allow (Design Library)";
    case "ask_sent":
      return entry.attempt === 2 ? "Ask again sent (2 of 2)" : "Ask again sent (1 of 2)";
    case "customer_allow":
      return entry.attempt === 2 ? "Customer allowed (2nd ask)" : "Customer allowed (1st ask)";
    case "customer_decline":
      return entry.attempt === 2 ? "Customer declined (2nd ask)" : "Customer declined (1st ask)";
    default:
      return "Permission update";
  }
}

/** @deprecated Prefer resolveCustomerUploadPermissionAskCount — kept for call sites typing. */
export type CustomerUploadPermissionFollowUpStatusForAsk =
  CustomerUploadCatalogPermissionFollowUpStatus;
