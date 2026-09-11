import {
  collection,
  limit,
  orderBy,
  query,
  where,
  type Firestore,
  type Query,
} from "firebase/firestore";

import { CUSTOMER_UPLOAD_COLLECTIONS } from "@fresh-prints/shared/constants/customerUpload/customerUploadCollections.constants";
import type { CustomerUploadPurpose } from "@fresh-prints/shared/types/customerUpload/customerUpload.enums";
import { isCustomerUploadEligibleForCatalogIntake } from "@fresh-prints/shared/utils/customerUploadCatalogIntakeEligibility";
import { isTerminalCustomerUploadPermissionDenial } from "@fresh-prints/shared/utils/customerUploadPermissionFollowUp";
import { isCustomerUploadReleasedToStudioIntake } from "@fresh-prints/shared/utils/customerUploadStudioIntakeRelease";
import { isMissingCustomerUploadPurpose } from "@fresh-prints/shared/utils/customerUploadPurpose";

export type CustomerUploadIntakeFilter =
  | "pending_staff_review"
  | "excluded_from_catalog"
  | "denied";

export const CUSTOMER_UPLOAD_INTAKE_PAGE_SIZE = 50;

export const CUSTOMER_UPLOAD_INTAKE_ENRICH_CONCURRENCY = 4;

export const CUSTOMER_UPLOAD_INTAKE_SEARCH_CUSTOMER_LIMIT = 40;

/**
 * Purpose + status + createdAt list query (uses purpose composite index).
 */
export function buildPurposeScopedIntakeQuery(
  db: Firestore,
  options: {
    purpose: CustomerUploadPurpose;
    catalogReviewStatus: CustomerUploadIntakeFilter;
    pageSize?: number;
  },
): Query {
  if (options.catalogReviewStatus === "denied") {
    return buildPurposeScopedDeniedIntakeQuery(db, {
      purpose: options.purpose,
      pageSize: options.pageSize,
    });
  }
  return query(
    collection(db, CUSTOMER_UPLOAD_COLLECTIONS.customerUploads),
    where("purpose", "==", options.purpose),
    where("catalogReviewStatus", "==", options.catalogReviewStatus),
    orderBy("createdAt", "desc"),
    limit(options.pageSize ?? CUSTOMER_UPLOAD_INTAKE_PAGE_SIZE),
  );
}

/** Classification-A Denied query: excluded lifecycle plus customer permission reason. */
export function buildPurposeScopedDeniedIntakeQuery(
  db: Firestore,
  options: { purpose: CustomerUploadPurpose; pageSize?: number },
): Query {
  return query(
    collection(db, CUSTOMER_UPLOAD_COLLECTIONS.customerUploads),
    where("purpose", "==", options.purpose),
    where("catalogReviewStatus", "==", "excluded_from_catalog"),
    where("catalogExclusionReason", "==", "customer_permission_denied"),
    orderBy("createdAt", "desc"),
    limit(options.pageSize ?? CUSTOMER_UPLOAD_INTAKE_PAGE_SIZE),
  );
}

/** Aggregate predicate for the Denied badge; returns no document pages. */
export function buildPurposeScopedDeniedCountQuery(
  db: Firestore,
  purpose: CustomerUploadPurpose,
): Query {
  return query(
    collection(db, CUSTOMER_UPLOAD_COLLECTIONS.customerUploads),
    where("purpose", "==", purpose),
    where("catalogReviewStatus", "==", "excluded_from_catalog"),
    where("catalogExclusionReason", "==", "customer_permission_denied"),
  );
}

/**
 * Per-customer upload history (uses customerUid + createdAt index).
 * Callers filter purpose / catalogReviewStatus client-side.
 */
export function buildCustomerUidUploadHistoryQuery(
  db: Firestore,
  options: {
    customerUid: string;
    pageSize?: number;
  },
): Query {
  return query(
    collection(db, CUSTOMER_UPLOAD_COLLECTIONS.customerUploads),
    where("customerUid", "==", options.customerUid),
    orderBy("createdAt", "desc"),
    limit(options.pageSize ?? CUSTOMER_UPLOAD_INTAKE_PAGE_SIZE),
  );
}

/**
 * Fallback when the customer has no auth uid yet (rare). Single-field equality;
 * callers filter purpose / status and sort.
 */
export function buildCustomerIdUploadQuery(
  db: Firestore,
  options: {
    customerId: string;
    pageSize?: number;
  },
): Query {
  return query(
    collection(db, CUSTOMER_UPLOAD_COLLECTIONS.customerUploads),
    where("customerId", "==", options.customerId),
    limit(options.pageSize ?? CUSTOMER_UPLOAD_INTAKE_PAGE_SIZE),
  );
}

/**
 * Purpose + status count query (no orderBy — matches badge predicate).
 */
export function buildPurposeScopedPendingCountQuery(
  db: Firestore,
  purpose: CustomerUploadPurpose,
): Query {
  return query(
    collection(db, CUSTOMER_UPLOAD_COLLECTIONS.customerUploads),
    where("purpose", "==", purpose),
    where("catalogReviewStatus", "==", "pending_staff_review"),
  );
}

/**
 * Status-only query for legacy missing-purpose recovery (H-DM-2).
 * Callers must filter with {@link filterLegacyMissingPurposeDocs} before enrichment.
 * Unbounded by purpose/page so missing-purpose print_request docs are not crowded out
 * by newer donations (metadata-only; do not enrich the unfiltered set).
 */
export function buildStatusScopedCatalogReviewQuery(
  db: Firestore,
  catalogReviewStatus: CustomerUploadIntakeFilter | "pending_staff_review",
): Query {
  if (catalogReviewStatus === "denied") {
    return buildStatusScopedDeniedCatalogReviewQuery(db);
  }
  return query(
    collection(db, CUSTOMER_UPLOAD_COLLECTIONS.customerUploads),
    where("catalogReviewStatus", "==", catalogReviewStatus),
  );
}

/** Legacy missing-purpose companion for the classification-A Denied tab. */
export function buildStatusScopedDeniedCatalogReviewQuery(db: Firestore): Query {
  return query(
    collection(db, CUSTOMER_UPLOAD_COLLECTIONS.customerUploads),
    where("catalogReviewStatus", "==", "excluded_from_catalog"),
    where("catalogExclusionReason", "==", "customer_permission_denied"),
  );
}

/** @deprecated Prefer {@link buildStatusScopedCatalogReviewQuery} */
export function buildPendingStaffReviewStatusQuery(db: Firestore): Query {
  return buildStatusScopedCatalogReviewQuery(db, "pending_staff_review");
}

export function filterLegacyMissingPurposeDocs<T extends { data: () => Record<string, unknown> }>(
  docs: T[],
): T[] {
  return docs.filter((docSnap) => isMissingCustomerUploadPurpose(docSnap.data().purpose));
}

/** Pending intake excludes print-only uploads where the customer denied library consent. */
export function filterCatalogIntakeEligibleDocs<T extends { data: () => Record<string, unknown> }>(
  docs: T[],
): T[] {
  return docs.filter((docSnap) => isCustomerUploadEligibleForCatalogIntake(docSnap.data()));
}

/**
 * Studio Uploaded Designs visibility: Denied / Excluded rows stay hidden until Add to Show
 * sets `studioIntakeReleasedAt`. Pending is already status-gated (`pending_staff_review`).
 */
export function filterStudioIntakeReleasedDocs<T extends { data: () => Record<string, unknown> }>(
  docs: T[],
): T[] {
  return docs.filter((docSnap) => isCustomerUploadReleasedToStudioIntake(docSnap.data()));
}

/** Excluded tab: staff exclusions + terminal second permission declines. */
export function filterStaffExcludedIntakeDocs<T extends { data: () => Record<string, unknown> }>(
  docs: T[],
): T[] {
  return docs.filter((docSnap) => {
    const data = docSnap.data();
    if (data.catalogReviewStatus !== "excluded_from_catalog") {
      return false;
    }
    if (!isCustomerUploadReleasedToStudioIntake(data)) {
      return false;
    }
    if (data.catalogExclusionReason === "customer_permission_denied") {
      return isTerminalCustomerUploadPermissionDenial(data);
    }
    return true;
  });
}

/** Denied tab: actionable customer permission denials only (not terminal 2nd decline). */
export function filterDeniedStudioIntakeDocs<T extends { data: () => Record<string, unknown> }>(
  docs: T[],
): T[] {
  return docs.filter((docSnap) => {
    const data = docSnap.data();
    return (
      data.catalogReviewStatus === "excluded_from_catalog" &&
      data.catalogExclusionReason === "customer_permission_denied" &&
      isCustomerUploadReleasedToStudioIntake(data) &&
      !isTerminalCustomerUploadPermissionDenial(data)
    );
  });
}

export function mergeIntakeDocsByCreatedAtDesc<
  T extends { id: string; data: () => Record<string, unknown> },
>(primary: T[], legacyMissingPurpose: T[], pageSize = CUSTOMER_UPLOAD_INTAKE_PAGE_SIZE): T[] {
  const byId = new Map<string, T>();
  for (const docSnap of primary) {
    byId.set(docSnap.id, docSnap);
  }
  for (const docSnap of legacyMissingPurpose) {
    if (!byId.has(docSnap.id)) {
      byId.set(docSnap.id, docSnap);
    }
  }

  const merged = [...byId.values()];
  merged.sort((a, b) => {
    const aMs = resolveStudioIntakeListSortMs(a.data());
    const bMs = resolveStudioIntakeListSortMs(b.data());
    return bMs - aMs;
  });
  return merged.slice(0, pageSize);
}

/**
 * Pending / intake list order: re-queued rows (Ask Again → Allow, Restore) use
 * `catalogPendingQueuedAt` when present. Fall back to follow-up Allow response time so
 * Pending jumps to the top even before a Functions redeploy that writes the new field.
 * Everyone else keeps `createdAt` so first arrival order is unchanged.
 */
export function resolveStudioIntakeListSortMs(data: Record<string, unknown>): number {
  const pendingQueued = timestampMs(data.catalogPendingQueuedAt);
  if (pendingQueued != null) {
    return pendingQueued;
  }
  if (data.catalogPermissionFollowUpStatus === "approved") {
    const responded = timestampMs(data.catalogPermissionFollowUpRespondedAt);
    if (responded != null) {
      return responded;
    }
  }
  return timestampMs(data.createdAt) ?? 0;
}

function timestampMs(value: unknown): number | null {
  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as { toMillis: () => number }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return null;
}

/**
 * Bounded concurrency pool for progressive card enrichment.
 */
export async function runWithConcurrencyLimit<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  if (items.length === 0) {
    return;
  }
  const limitN = Math.max(1, Math.min(concurrency, items.length));
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      await worker(items[index]!, index);
    }
  }

  await Promise.all(Array.from({ length: limitN }, () => runWorker()));
}
