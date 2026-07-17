import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";

import {
  ASSISTED_CREATION_COLLECTION,
} from "@fresh-prints/shared/constants/assistedCreation/assistedCreation.constants";

import { db } from "../../../config/firebase";
import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";

/**
 * Live count of Assisted Creation requests that need staff attention:
 * brand-new submissions + customer revision requests.
 */
export function useAssistedCreationActionableCount(): number {
  const { user } = useAuth();
  const canView = Boolean(user && permissionService.hasPermission(user, "manageRequests"));
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!canView) {
      setCount(0);
      return;
    }

    const actionableQuery = query(
      collection(db, ASSISTED_CREATION_COLLECTION),
      where("status", "in", ["submitted", "revision_requested"]),
    );

    const unsubscribe = onSnapshot(
      actionableQuery,
      (snapshot) => {
        setCount(snapshot.size);
      },
      (error) => {
        console.warn("[useAssistedCreationActionableCount] listener failed:", error.message);
        setCount(0);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [canView]);

  return count;
}
