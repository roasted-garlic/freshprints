import { useEffect, useState } from "react";
import { onSnapshot, type Unsubscribe } from "firebase/firestore";

import { CUSTOMER_UPLOAD_COLLECTIONS } from "@fresh-prints/shared/constants/customerUpload/customerUploadCollections.constants";
import type { CustomerUploadPurpose } from "@fresh-prints/shared/types/customerUpload/customerUpload.enums";
import { isMissingCustomerUploadPurpose } from "@fresh-prints/shared/utils/customerUploadPurpose";
import {
  traceFirestoreListenerAttach,
  traceFirestoreListenerEmission,
  traceWrappedUnsubscribe,
} from "@fresh-prints/shared/utils/firestoreUsageTrace";

import { db } from "../../../config/firebase";
import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import {
  buildPurposeScopedPendingCountQuery,
  buildStatusScopedCatalogReviewQuery,
} from "../utils/customerUploadIntakeQueries";

export interface PendingCustomerUploadCounts {
  catalogDonation: number;
  printRequest: number;
}

const EMPTY_COUNTS: PendingCustomerUploadCounts = {
  catalogDonation: 0,
  printRequest: 0,
};

/**
 * Live pending staff-review counts for both upload purposes.
 * Purpose-scoped listeners match intake list predicates; a lightweight status
 * companion adds legacy missing-purpose docs as print_request (H-DM-2).
 * Sidebar badges share this hook so they do not open duplicate query sets.
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

    let cancelled = false;
    let printRequestScoped = 0;
    let catalogDonationScoped = 0;
    let legacyMissingPurpose = 0;
    const unsubscribers: Unsubscribe[] = [];

    const publish = () => {
      if (cancelled) {
        return;
      }
      setCounts({
        catalogDonation: catalogDonationScoped,
        printRequest: printRequestScoped + legacyMissingPurpose,
      });
    };

    const attachPurposeCount = (purpose: CustomerUploadPurpose) => {
      const countQuery = buildPurposeScopedPendingCountQuery(db, purpose);
      const trace = {
        app: "studio" as const,
        collection: CUSTOMER_UPLOAD_COLLECTIONS.customerUploads,
        constraints: [`purpose==${purpose}`, "catalogReviewStatus==pending_staff_review"],
        source: "usePendingCustomerUploadCounts",
        triggerReason: "authentication" as const,
      };
      traceFirestoreListenerAttach(trace);
      unsubscribers.push(
        traceWrappedUnsubscribe(
          trace,
          onSnapshot(
            countQuery,
            (snapshot) => {
              traceFirestoreListenerEmission(trace, snapshot.size);
              if (purpose === "catalog_donation") {
                catalogDonationScoped = snapshot.size;
              } else {
                printRequestScoped = snapshot.size;
              }
              publish();
            },
            (error) => {
              console.warn(
                `[usePendingCustomerUploadCounts] ${purpose} listener failed:`,
                error.message,
              );
              if (purpose === "catalog_donation") {
                catalogDonationScoped = 0;
              } else {
                printRequestScoped = 0;
              }
              publish();
            },
          ),
        ),
      );
    };

    attachPurposeCount("print_request");
    attachPurposeCount("catalog_donation");

    const legacyQuery = buildStatusScopedCatalogReviewQuery(db, "pending_staff_review");
    const legacyTrace = {
      app: "studio" as const,
      collection: CUSTOMER_UPLOAD_COLLECTIONS.customerUploads,
      constraints: ["catalogReviewStatus==pending_staff_review", "legacyMissingPurposeOnly"],
      source: "usePendingCustomerUploadCounts.legacyMissingPurpose",
      triggerReason: "authentication" as const,
    };
    traceFirestoreListenerAttach(legacyTrace);
    unsubscribers.push(
      traceWrappedUnsubscribe(
        legacyTrace,
        onSnapshot(
          legacyQuery,
          (snapshot) => {
            legacyMissingPurpose = 0;
            for (const docSnap of snapshot.docs) {
              if (isMissingCustomerUploadPurpose(docSnap.data().purpose)) {
                legacyMissingPurpose += 1;
              }
            }
            traceFirestoreListenerEmission(legacyTrace, legacyMissingPurpose);
            publish();
          },
          (error) => {
            console.warn(
              "[usePendingCustomerUploadCounts] legacy missing-purpose listener failed:",
              error.message,
            );
            legacyMissingPurpose = 0;
            publish();
          },
        ),
      ),
    );

    return () => {
      cancelled = true;
      for (const unsubscribe of unsubscribers) {
        unsubscribe();
      }
    };
  }, [canView]);

  return counts;
}

/**
 * Single-purpose pending count. Prefer {@link usePendingCustomerUploadCounts}
 * when both Sidebar badges are shown (one shared listener set).
 */
export function usePendingCustomerUploadCount(
  purposeScope: CustomerUploadPurpose = "print_request",
): number {
  const counts = usePendingCustomerUploadCounts();
  return purposeScope === "catalog_donation" ? counts.catalogDonation : counts.printRequest;
}
