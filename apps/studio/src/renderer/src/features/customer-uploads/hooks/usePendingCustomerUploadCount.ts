import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";

import { CUSTOMER_UPLOAD_COLLECTIONS } from "@fresh-prints/shared/constants/customerUpload/customerUploadCollections.constants";

import { db } from "../../../config/firebase";
import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";

/**
 * Live count of customer uploads awaiting staff catalog review.
 * Used by the sidebar badge on Customer Uploads.
 */
export function usePendingCustomerUploadCount(): number {
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
        setCount(snapshot.size);
      },
      (error) => {
        console.warn("[usePendingCustomerUploadCount] listener failed:", error.message);
        setCount(0);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [canView]);

  return count;
}
