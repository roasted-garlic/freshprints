import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import type {
  DisableCustomerAccountRequest,
  DisableCustomerAccountResponse,
  RestoreCustomerAccountRequest,
  RestoreCustomerAccountResponse,
} from "../../packages/shared/src/types/customer/customerIdentityManagement.types";
import { adminAuth, adminDb } from "./lib/admin";
import { appendCustomerActivityEvent } from "./lib/customerActivityEvents";
import { assertCustomerEligibleForIdentityMutation } from "./lib/customerAccountEligibility";
import { loadCustomerEligibilitySnapshot } from "./lib/customerIdentityEligibilitySnapshot";
import { assertNoActiveIdentityOperationLock } from "./lib/customerIdentityOperationLock";
import { loadCallerProfile } from "./lib/caller";
import {
  failedPrecondition,
  invalidArgument,
  permissionDenied,
  unauthenticated,
} from "./lib/errors";

function assertOwnerCaller(caller: Awaited<ReturnType<typeof loadCallerProfile>>): void {
  if (!caller.isActive || caller.role !== "owner") {
    throw permissionDenied("Only owners can disable or restore customer accounts.");
  }
}

function mapHttpsError(error: unknown): never {
  if (error instanceof HttpsError) {
    throw error;
  }
  if (error instanceof Error) {
    throw invalidArgument(error.message);
  }
  throw failedPrecondition("Unable to process customer account state change right now.");
}

function parseCustomerId(data: unknown): string {
  if (!data || typeof data !== "object") {
    throw invalidArgument("Request data is required.");
  }
  const customerId =
    "customerId" in data && typeof data.customerId === "string" ? data.customerId.trim() : "";
  if (!customerId) {
    throw invalidArgument("Select a customer.");
  }
  return customerId;
}

export const disableCustomerAccount = onCall(
  async (request): Promise<DisableCustomerAccountResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      const caller = await loadCallerProfile(request.auth.uid);
      assertOwnerCaller(caller);

      const customerId = parseCustomerId(request.data as DisableCustomerAccountRequest);
      const reason =
        request.data &&
        typeof request.data === "object" &&
        "reason" in request.data &&
        typeof request.data.reason === "string"
          ? request.data.reason.trim().slice(0, 500)
          : undefined;

      const snapshot = await loadCustomerEligibilitySnapshot(customerId);
      assertCustomerEligibleForIdentityMutation(snapshot, "disable");

      const customerRef = adminDb.collection("customers").doc(customerId);
      const customerSnap = await customerRef.get();
      const data = customerSnap.data() ?? {};

      if (data.isDisabled === true) {
        return {
          outcome: "already_done",
          message: "This customer account is already disabled.",
          customerId,
          authUidDisabled: snapshot.authUid,
          authDisableFailed: false,
        };
      }

      if (data.isDeleted === true) {
        throw failedPrecondition(
          "Tombstoned customer accounts use the product deletion workflow and cannot be reversibly disabled.",
        );
      }

      assertNoActiveIdentityOperationLock(data.identityOperationLock);

      const authUid = snapshot.authUid;
      if (authUid && authUid === request.auth.uid) {
        throw invalidArgument("You cannot disable your own account.");
      }

      const now = FieldValue.serverTimestamp();
      const batch = adminDb.batch();

      batch.set(
        customerRef,
        {
          isDisabled: true,
          disabledAt: now,
          disabledBy: caller.id,
          ...(reason ? { disabledReason: reason } : {}),
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
            updatedBy: caller.id,
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
        throw failedPrecondition(
          "Customer was marked disabled in Fresh Prints, but Firebase sign-in could not be disabled. Retry Disable account or check Firebase Auth.",
        );
      }

      await appendCustomerActivityEvent({
        customerId,
        eventType: "account.disabled",
        actorUid: caller.id,
        actorRole: "owner",
        result: "success",
        metadata: reason ? { disabledReason: reason } : undefined,
      });

      return {
        outcome: "success",
        message: "Customer account disabled. History and username are preserved.",
        customerId,
        authUidDisabled: authUid,
        authDisableFailed: false,
      };
    } catch (error) {
      mapHttpsError(error);
    }
  },
);

export const restoreCustomerAccount = onCall(
  async (request): Promise<RestoreCustomerAccountResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      const caller = await loadCallerProfile(request.auth.uid);
      assertOwnerCaller(caller);

      const customerId = parseCustomerId(request.data as RestoreCustomerAccountRequest);
      const snapshot = await loadCustomerEligibilitySnapshot(customerId);
      assertCustomerEligibleForIdentityMutation(snapshot, "restore");

      const customerRef = adminDb.collection("customers").doc(customerId);
      const customerSnap = await customerRef.get();
      const data = customerSnap.data() ?? {};

      if (data.isDeleted === true) {
        throw failedPrecondition("Tombstoned customer accounts cannot be restored.");
      }

      if (data.isMerged === true) {
        throw failedPrecondition("Merged customer accounts cannot be restored.");
      }

      if (data.isDisabled !== true) {
        return {
          outcome: "already_done",
          message: "This customer account is not disabled.",
          customerId,
          authUidRestored: snapshot.authUid,
          authRestoreFailed: false,
        };
      }

      assertNoActiveIdentityOperationLock(data.identityOperationLock);

      const authUid = snapshot.authUid;
      const now = FieldValue.serverTimestamp();
      const batch = adminDb.batch();

      batch.set(
        customerRef,
        {
          isDisabled: false,
          disabledAt: FieldValue.delete(),
          disabledBy: FieldValue.delete(),
          disabledReason: FieldValue.delete(),
          updatedAt: now,
        },
        { merge: true },
      );

      if (authUid) {
        batch.set(
          adminDb.collection("users").doc(authUid),
          {
            isActive: true,
            isDeleted: false,
            updatedAt: now,
            updatedBy: caller.id,
          },
          { merge: true },
        );
      }

      await batch.commit();

      let authRestoreFailed = false;
      if (authUid) {
        try {
          await adminAuth.updateUser(authUid, { disabled: false });
        } catch (error) {
          authRestoreFailed = true;
          console.error("Failed to re-enable Auth user for restored customer.", {
            uid: authUid,
            message: error instanceof Error ? error.message : "unknown",
          });
        }
      }

      if (authRestoreFailed) {
        throw failedPrecondition(
          "Customer was restored in Fresh Prints, but Firebase sign-in could not be re-enabled. Retry Re-enable account or check Firebase Auth.",
        );
      }

      await appendCustomerActivityEvent({
        customerId,
        eventType: "account.restored",
        actorUid: caller.id,
        actorRole: "owner",
        result: "success",
      });

      return {
        outcome: "success",
        message: "Customer account restored.",
        customerId,
        authUidRestored: authUid,
        authRestoreFailed: false,
      };
    } catch (error) {
      mapHttpsError(error);
    }
  },
);
