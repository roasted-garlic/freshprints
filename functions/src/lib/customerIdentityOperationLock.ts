import { FieldValue } from "firebase-admin/firestore";

import type { CustomerIdentityOperationLockKind } from "../../../packages/shared/src/types/customer/customerIdentity.types";
import { adminDb } from "./admin";
import { failedPrecondition } from "./errors";

const LOCK_MAX_AGE_MS = 15 * 60 * 1000;

export async function setCustomerIdentityOperationLock(
  customerId: string,
  options: {
    kind: CustomerIdentityOperationLockKind;
    lockedBy: string;
    previewChecksum?: string;
  },
): Promise<void> {
  await adminDb.collection("customers").doc(customerId).set(
    {
      identityOperationLock: {
        kind: options.kind,
        lockedAt: FieldValue.serverTimestamp(),
        lockedBy: options.lockedBy,
        ...(options.previewChecksum ? { previewChecksum: options.previewChecksum } : {}),
      },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function clearCustomerIdentityOperationLock(customerId: string): Promise<void> {
  await adminDb.collection("customers").doc(customerId).set(
    {
      identityOperationLock: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export function isIdentityOperationLockActive(
  lock: FirebaseFirestore.DocumentData | undefined,
): boolean {
  if (!lock || typeof lock !== "object") {
    return false;
  }

  const lockedAt = lock.lockedAt;
  if (!lockedAt || typeof lockedAt.toMillis !== "function") {
    return true;
  }

  return Date.now() - lockedAt.toMillis() < LOCK_MAX_AGE_MS;
}

export function assertNoActiveIdentityOperationLock(
  lock: FirebaseFirestore.DocumentData | undefined,
): void {
  if (isIdentityOperationLockActive(lock)) {
    throw failedPrecondition("Another identity operation is in progress for this customer.");
  }
}
