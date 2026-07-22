import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";

import { CUSTOMER_UPLOAD_COLLECTIONS } from "@fresh-prints/shared/constants/customerUpload/customerUploadCollections.constants";
import type { CustomerUploadPurpose } from "@fresh-prints/shared/types/customerUpload/customerUpload.enums";
import { resolveCustomerUploadPurpose } from "@fresh-prints/shared/utils/customerUploadPurpose";
import {
  traceFirestoreListenerAttach,
  traceFirestoreRead,
  traceWrappedUnsubscribe,
} from "@fresh-prints/shared/utils/firestoreUsageTrace";

import { db } from "../../../config/firebase";
import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";

const TRACE_KEY = "customerUploads:catalogReviewStatus=pending_staff_review";

export interface PendingCustomerUploadCounts {
  catalogDonation: number;
  printRequest: number;
}

const EMPTY_COUNTS: PendingCustomerUploadCounts = {
  catalogDonation: 0,
  printRequest: 0,
};

/**
 * Live pending staff-review counts for both upload purposes from a single listener.
 * Sidebar badges share this hook so they do not open duplicate queries.
 */
export function usePendingCustomerUploadCounts(): PendingCustomerUploadCounts {
  const { user } = useAuth();
  const canView = Boolean(user && permissionService.canViewCustomerUploadIntake(user));
  const [counts, setCounts] = useState<PendingCustomerUploadCounts>(EMPTY_COUNTS);

  useEffect(() => {
    if (!canView) {
      setCounts(EMPTY_COUNTS);
      return;
    }

    const pendingQuery = query(
      collection(db, CUSTOMER_UPLOAD_COLLECTIONS.customerUploads),
      where("catalogReviewStatus", "==", "pending_staff_review"),
    );

    traceFirestoreListenerAttach(TRACE_KEY);
    const unsubscribe = onSnapshot(
      pendingQuery,
      (snapshot) => {
        traceFirestoreRead("onSnapshotEmit", TRACE_KEY);
        let printRequest = 0;
        let catalogDonation = 0;

        for (const docSnap of snapshot.docs) {
          const purpose = resolveCustomerUploadPurpose(docSnap.data().purpose);
          if (purpose === "catalog_donation") {
            catalogDonation += 1;
          } else {
            printRequest += 1;
          }
        }

        setCounts({ catalogDonation, printRequest });
      },
      (error) => {
        console.warn("[usePendingCustomerUploadCounts] listener failed:", error.message);
        setCounts(EMPTY_COUNTS);
      },
    );

    return traceWrappedUnsubscribe(TRACE_KEY, unsubscribe);
  }, [canView]);

  return counts;
}

/**
 * Single-purpose pending count. Prefer {@link usePendingCustomerUploadCounts}
 * when both Sidebar badges are shown (one shared listener).
 */
export function usePendingCustomerUploadCount(
  purposeScope: CustomerUploadPurpose = "print_request",
): number {
  const counts = usePendingCustomerUploadCounts();
  return purposeScope === "catalog_donation" ? counts.catalogDonation : counts.printRequest;
}
