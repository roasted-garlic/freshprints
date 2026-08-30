import { FieldValue } from "firebase-admin/firestore";

import { adminAuth, adminDb } from "./admin";
import { appendCustomerActivityEvent } from "./customerActivityEvents";
import { assertNoActiveIdentityOperationLock } from "./customerIdentityOperationLock";

export interface ApplyCustomerAccountDisableResult {
  outcome: "success" | "already_done" | "failed";
  message: string;
  authUidDisabled: string | null;
  authDisableFailed: boolean;
}

export async function applyCustomerAccountDisableInternal(input: {
  customerId: string;
  callerId: string;
  reason?: string;
}): Promise<ApplyCustomerAccountDisableResult> {
  const customerRef = adminDb.collection("customers").doc(input.customerId);
  const customerSnap = await customerRef.get();
  const data = customerSnap.data() ?? {};

  if (!customerSnap.exists) {
    return {
      outcome: "failed",
      message: "Customer not found.",
      authUidDisabled: null,
      authDisableFailed: false,
    };
  }

  if (data.isDisabled === true) {
    return {
      outcome: "already_done",
      message: "This customer account is already disabled.",
      authUidDisabled:
        typeof data.userId === "string" && data.userId.trim() ? data.userId.trim() : null,
      authDisableFailed: false,
    };
  }

  if (data.isDeleted === true) {
    return {
      outcome: "failed",
      message: "Tombstoned customer accounts cannot be reversibly disabled.",
      authUidDisabled: null,
      authDisableFailed: false,
    };
  }

  if (data.isMerged === true) {
    return {
      outcome: "failed",
      message: "Merged customer accounts cannot be reversibly disabled.",
      authUidDisabled: null,
      authDisableFailed: false,
    };
  }

  assertNoActiveIdentityOperationLock(data.identityOperationLock);

  const authUid =
    typeof data.userId === "string" && data.userId.trim() ? data.userId.trim() : null;
  const now = FieldValue.serverTimestamp();
  const batch = adminDb.batch();

  batch.set(
    customerRef,
    {
      isDisabled: true,
      disabledAt: now,
      disabledBy: input.callerId,
      ...(input.reason ? { disabledReason: input.reason.slice(0, 500) } : {}),
      updatedAt: now,
    },
    { merge: true },
  );

  if (authUid) {
    batch.set(
      adminDb.collection("users").doc(authUid),
      {
        isActive: false,
        updatedAt: now,
        updatedBy: input.callerId,
      },
      { merge: true },
    );
  }

  await batch.commit();

  let authDisableFailed = false;
  if (authUid) {
    try {
      await adminAuth.updateUser(authUid, { disabled: true });
    } catch (error) {
      authDisableFailed = true;
      console.error("Failed to disable Auth user for reversibly disabled customer.", {
        uid: authUid,
        message: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  if (authDisableFailed) {
    return {
      outcome: "failed",
      message:
        "Customer was marked disabled in Fresh Prints, but Firebase sign-in could not be disabled. Retry Disable account or check Firebase Auth.",
      authUidDisabled: authUid,
      authDisableFailed: true,
    };
  }

  await appendCustomerActivityEvent({
    customerId: input.customerId,
    eventType: "account.disabled",
    actorUid: input.callerId,
    actorRole: "owner",
    result: "success",
    metadata: input.reason ? { disabledReason: input.reason.slice(0, 500) } : undefined,
  });

  return {
    outcome: "success",
    message: "Customer account disabled. History and username are preserved.",
    authUidDisabled: authUid,
    authDisableFailed: false,
  };
}
