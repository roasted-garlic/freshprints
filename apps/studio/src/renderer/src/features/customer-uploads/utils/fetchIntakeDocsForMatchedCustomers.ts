import { getDocs, type Firestore, type QueryDocumentSnapshot } from "firebase/firestore";

import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";
import type { CustomerUploadPurpose } from "@fresh-prints/shared/types/customerUpload/customerUpload.enums";
import { isCustomerUploadEligibleForCatalogIntake } from "@fresh-prints/shared/utils/customerUploadCatalogIntakeEligibility";
import { resolveCustomerUploadPurpose } from "@fresh-prints/shared/utils/customerUploadPurpose";

import {
  buildCustomerIdUploadQuery,
  buildCustomerUidUploadHistoryQuery,
  CUSTOMER_UPLOAD_INTAKE_ENRICH_CONCURRENCY,
  CUSTOMER_UPLOAD_INTAKE_PAGE_SIZE,
  CUSTOMER_UPLOAD_INTAKE_SEARCH_CUSTOMER_LIMIT,
  runWithConcurrencyLimit,
  type CustomerUploadIntakeFilter,
} from "./customerUploadIntakeQueries";

function createdAtMs(value: unknown): number {
  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as { toMillis: () => number }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return 0;
}

function matchesIntakeScope(
  data: Record<string, unknown>,
  purpose: CustomerUploadPurpose,
  catalogReviewStatus: CustomerUploadIntakeFilter,
): boolean {
  if (data.catalogReviewStatus !== catalogReviewStatus) {
    return false;
  }
  if (resolveCustomerUploadPurpose(data.purpose) !== purpose) {
    return false;
  }
  if (catalogReviewStatus === "pending_staff_review" && !isCustomerUploadEligibleForCatalogIntake(data)) {
    return false;
  }
  return true;
}

export async function fetchIntakeDocsForMatchedCustomers(input: {
  db: Firestore;
  customers: readonly Customer[];
  purpose: CustomerUploadPurpose;
  catalogReviewStatus: CustomerUploadIntakeFilter;
  perCustomerLimit?: number;
}): Promise<{
  docs: Array<{ id: string; data: () => Record<string, unknown> }>;
  hasMore: boolean;
}> {
  const perCustomerLimit = input.perCustomerLimit ?? CUSTOMER_UPLOAD_INTAKE_PAGE_SIZE;
  const matched = input.customers.slice(0, CUSTOMER_UPLOAD_INTAKE_SEARCH_CUSTOMER_LIMIT);
  const byId = new Map<string, QueryDocumentSnapshot>();
  let hasMore = false;

  await runWithConcurrencyLimit(matched, CUSTOMER_UPLOAD_INTAKE_ENRICH_CONCURRENCY, async (customer) => {
    const customerUid = customer.userId?.trim();
    const snapshot = customerUid
      ? await getDocs(
          buildCustomerUidUploadHistoryQuery(input.db, {
            customerUid,
            pageSize: perCustomerLimit,
          }),
        )
      : await getDocs(
          buildCustomerIdUploadQuery(input.db, {
            customerId: customer.id,
            pageSize: perCustomerLimit,
          }),
        );

    if (snapshot.size >= perCustomerLimit) {
      hasMore = true;
    }

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as Record<string, unknown>;
      if (!matchesIntakeScope(data, input.purpose, input.catalogReviewStatus)) {
        continue;
      }
      byId.set(docSnap.id, docSnap);
    }
  });

  const docs = [...byId.values()]
    .sort((left, right) => createdAtMs(right.data().createdAt) - createdAtMs(left.data().createdAt))
    .map((docSnap) => ({
      id: docSnap.id,
      data: () => docSnap.data() as Record<string, unknown>,
    }));

  return { docs, hasMore };
}
