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
import { isMissingCustomerUploadPurpose } from "@fresh-prints/shared/utils/customerUploadPurpose";

export type CustomerUploadIntakeFilter = "pending_staff_review" | "excluded_from_catalog";

export const CUSTOMER_UPLOAD_INTAKE_PAGE_SIZE = 50;

export const CUSTOMER_UPLOAD_INTAKE_ENRICH_CONCURRENCY = 4;

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
  return query(
    collection(db, CUSTOMER_UPLOAD_COLLECTIONS.customerUploads),
    where("purpose", "==", options.purpose),
    where("catalogReviewStatus", "==", options.catalogReviewStatus),
    orderBy("createdAt", "desc"),
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
  return query(
    collection(db, CUSTOMER_UPLOAD_COLLECTIONS.customerUploads),
    where("catalogReviewStatus", "==", catalogReviewStatus),
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
    const aMs = createdAtMs(a.data().createdAt) ?? 0;
    const bMs = createdAtMs(b.data().createdAt) ?? 0;
    return bMs - aMs;
  });
  return merged.slice(0, pageSize);
}

function createdAtMs(value: unknown): number | null {
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
