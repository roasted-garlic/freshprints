import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";

import { CUSTOMER_UPLOAD_COLLECTIONS } from "@fresh-prints/shared/constants/customerUpload/customerUploadCollections.constants";
import type { CustomerUploadPurpose } from "@fresh-prints/shared/types/customerUpload/customerUpload.enums";
import { resolveCustomerUploadPurpose } from "@fresh-prints/shared/utils/customerUploadPurpose";

import { db } from "../../../config/firebase";
import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";

/**
 * Live count of uploads awaiting staff catalog review for a purpose scope.
 * Print scope excludes catalog donations (including legacy docs without purpose).
 */
export function usePendingCustomerUploadCount(
  purposeScope: CustomerUploadPurpose = "print_request",
): number {
  const { user } = useAuth();
  const canView = Boolean(user && permissionService.canViewCustomerUploadIntake(user));
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!canView) {
      setCount(0);
      return;
    }

    const pendingQuery = query(
      collection(db, CUSTOMER_UPLOAD_COLLECTIONS.customerUploads),
      where("catalogReviewStatus", "==", "pending_staff_review"),
    );

    const unsubscribe = onSnapshot(
      pendingQuery,
      (snapshot) => {
        const matching = snapshot.docs.filter((docSnap) => {
          const purpose = resolveCustomerUploadPurpose(docSnap.data().purpose);
          return purposeScope === "catalog_donation"
            ? purpose === "catalog_donation"
            : purpose !== "catalog_donation";
        });
        setCount(matching.length);
      },
      (error) => {
        console.warn("[usePendingCustomerUploadCount] listener failed:", error.message);
        setCount(0);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [canView, purposeScope]);

  return count;
}
