import { Timestamp } from "firebase-admin/firestore";

import type { CustomerEligibilitySnapshot } from "./customerAccountEligibility";
import {
  buildBlockersFromCounts,
  buildCustomerEligibilityChecksum,
  collectCustomerHistoryBlockerCounts,
  isEligibleForHardDelete,
} from "./customerAccountEligibility";
import {
  countCollectionWhereEquals,
  countStorageObjectsWithPrefix,
  hasSubcollectionDocuments,
} from "./customerAccountIdentityBootstrapDeletion";
import { isIdentityOperationLockActive } from "./customerIdentityOperationLock";
import { adminDb } from "./admin";
import { invalidArgument } from "./errors";

export async function loadCustomerEligibilitySnapshot(
  customerId: string,
): Promise<CustomerEligibilitySnapshot> {
  const customerSnap = await adminDb.collection("customers").doc(customerId).get();
  if (!customerSnap.exists) {
    throw invalidArgument("Customer not found.");
  }

  const data = customerSnap.data() ?? {};
  const authUid =
    typeof data.userId === "string" && data.userId.trim() ? data.userId.trim() : null;
  const username =
    typeof data.username === "string" && data.username.trim()
      ? data.username.trim().toLowerCase()
      : null;
  const displayName =
    typeof data.displayName === "string" && data.displayName.trim()
      ? data.displayName.trim()
      : "Customer";
  const isDeleted = data.isDeleted === true;
  const isDisabled = data.isDisabled === true;
  const isMerged = data.isMerged === true;
  const hasIdentityOperationLock = isIdentityOperationLockActive(data.identityOperationLock);

  const updatedAt = data.updatedAt;
  const updatedAtMillis =
    updatedAt instanceof Timestamp || (updatedAt && typeof updatedAt.toMillis === "function")
      ? updatedAt.toMillis()
      : null;

  const blockerCounts = await collectCustomerHistoryBlockerCounts(
    {
      countWhereEquals: countCollectionWhereEquals,
      hasSubcollectionDocs: hasSubcollectionDocuments,
      countStoragePrefix: countStorageObjectsWithPrefix,
    },
    { customerId, authUid },
  );

  const blockers = buildBlockersFromCounts(blockerCounts, {
    isDeleted,
    isMerged,
    hasIdentityOperationLock,
  });

  return {
    customerId,
    authUid,
    username,
    displayName,
    isDeleted,
    isDisabled,
    isMerged,
    hasIdentityOperationLock,
    blockerCounts,
    blockers,
    eligibleForHardDelete: isEligibleForHardDelete(blockers),
    updatedAtMillis,
  };
}

export function buildEligibilityChecksumFromSnapshot(
  snapshot: CustomerEligibilitySnapshot,
): string {
  return buildCustomerEligibilityChecksum({
    customerId: snapshot.customerId,
    updatedAtMillis: snapshot.updatedAtMillis,
    blockerCounts: snapshot.blockerCounts,
    isDeleted: snapshot.isDeleted,
    isDisabled: snapshot.isDisabled,
    isMerged: snapshot.isMerged,
    hasIdentityOperationLock: snapshot.hasIdentityOperationLock,
  });
}
