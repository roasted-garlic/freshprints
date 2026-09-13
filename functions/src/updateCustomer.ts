import { HttpsError, onCall } from "firebase-functions/v2/https";

import type { UpdateCustomerResponse } from "../../packages/shared/src/types/customer/updateCustomer.types";
import { adminAuth, adminDb } from "./lib/admin";
import { loadCallerProfile } from "./lib/caller";
import { applyCustomerProfileUpdate } from "./lib/customerProfileUpdate";
import {
  normalizeCustomerEmail,
  validateUpdateCustomerRequest,
} from "./lib/customerUpdateValidation";
import { alreadyExists, internal, invalidArgument, unauthenticated } from "./lib/errors";
import {
  initializeIdentitySnapshotPropagation,
  propagateCustomerIdentitySnapshots,
  resumeCustomerIdentitySnapshotPropagation,
} from "./lib/propagateCustomerIdentitySnapshots";
import { assertCanManageCustomers } from "./lib/permissions";
import { appendCustomerActivityEvent } from "./lib/customerActivityEvents";

interface CustomerRecord {
  userId?: string;
  email?: string;
}

function normalizeOptionalEmail(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return normalizeCustomerEmail(value);
}

function mapHttpsError(error: unknown): never {
  if (error instanceof HttpsError) {
    throw error;
  }

  if (error instanceof Error) {
    throw invalidArgument(error.message);
  }

  throw internal("Unable to update the customer right now.");
}

async function assertEmailAvailableForCustomerUpdate(
  email: string,
  options: { customerId: string; userId?: string },
): Promise<void> {
  const [usersSnapshot, customersSnapshot] = await Promise.all([
    adminDb.collection("users").where("email", "==", email).limit(2).get(),
    adminDb.collection("customers").where("email", "==", email).limit(2).get(),
  ]);

  const emailUsedByAnotherUser = usersSnapshot.docs.some((userDoc) => userDoc.id !== options.userId);
  const emailUsedByAnotherCustomer = customersSnapshot.docs.some(
    (customerDoc) => customerDoc.id !== options.customerId,
  );

  if (emailUsedByAnotherUser || emailUsedByAnotherCustomer) {
    throw alreadyExists("That email is already used by another account.");
  }

  const existingAuthUser = await adminAuth.getUserByEmail(email).catch(() => null);

  if (existingAuthUser && existingAuthUser.uid !== options.userId) {
    throw alreadyExists("That email is already used by another account.");
  }
}

async function syncPortalAuthEmail(userId: string, email: string, displayName: string): Promise<boolean> {
  try {
    await adminAuth.updateUser(userId, {
      email,
      displayName,
    });
    return true;
  } catch (error) {
    console.error("Failed to sync customer email to Firebase Auth.", {
      userId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return false;
  }
}

export const updateCustomer = onCall(async (request): Promise<UpdateCustomerResponse> => {
  if (!request.auth?.uid) {
    throw unauthenticated();
  }

  const caller = await loadCallerProfile(request.auth.uid);
  assertCanManageCustomers(caller);

  try {
    const payload = validateUpdateCustomerRequest(request.data);
    const customerRef = adminDb.collection("customers").doc(payload.customerId);
    const customerSnapshot = await customerRef.get();

    if (!customerSnapshot.exists) {
      throw invalidArgument("Customer not found.");
    }

    const current = customerSnapshot.data() as CustomerRecord & {
      username?: string;
    };
    const linkedUserId = typeof current.userId === "string" ? current.userId : undefined;
    const previousUsername =
      typeof current.username === "string" ? current.username.trim().toLowerCase() : "";

    if (linkedUserId && !payload.email) {
      throw invalidArgument("Email is required for customers with Portal access.");
    }

    if (payload.email) {
      const currentEmail = normalizeOptionalEmail(
        typeof current.email === "string" ? current.email : undefined,
      );

      if (!currentEmail || currentEmail !== payload.email) {
        await assertEmailAvailableForCustomerUpdate(payload.email, {
          customerId: payload.customerId,
          userId: linkedUserId,
        });
      }
    }

    const updateResult = await applyCustomerProfileUpdate({
      customerId: payload.customerId,
      displayName: payload.displayName,
      username: payload.username,
      email: payload.email,
      notes: payload.notes,
      mode: "staff",
      callerId: caller.id,
    });

    if (updateResult.usernameChanged) {
      await appendCustomerActivityEvent({
        customerId: payload.customerId,
        eventType: "account.username_changed",
        actorUid: caller.id,
        actorRole: caller.role === "owner" ? "owner" : "admin",
        result: "success",
        metadata: {
          previousUsername,
          newUsername: updateResult.username,
        },
      });
    }

    let portalAuthEmailSynced = true;
    let portalAuthDisplayNameSynced = true;

    if (linkedUserId && updateResult.emailChanged && payload.email) {
      portalAuthEmailSynced = await syncPortalAuthEmail(
        linkedUserId,
        payload.email,
        updateResult.displayName,
      );
    } else if (
      linkedUserId &&
      updateResult.displayNameChanged &&
      !updateResult.emailChanged
    ) {
      try {
        await adminAuth.updateUser(linkedUserId, {
          displayName: updateResult.displayName,
        });
      } catch (error) {
        portalAuthDisplayNameSynced = false;
        console.error("Failed to sync customer display name to Firebase Auth.", {
          userId: linkedUserId,
          message: error instanceof Error ? error.message : "unknown",
        });
      }
    }

    let propagationComplete = true;
    let propagationStatus: UpdateCustomerResponse["propagationStatus"] = "completed";
    let printRequestsUpdated = 0;
    let designIssueReportsUpdated = 0;
    let propagationWarning: string | undefined;

    try {
      if (updateResult.identityChanged) {
        await initializeIdentitySnapshotPropagation(payload.customerId, {
          username: updateResult.username,
          displayName: updateResult.displayName,
        });

        const propagation = await propagateCustomerIdentitySnapshots(payload.customerId);

        if (!propagation.complete) {
          const resumed = await resumeCustomerIdentitySnapshotPropagation(payload.customerId);
          propagationComplete = resumed.complete;
          propagationStatus = resumed.status;
          printRequestsUpdated = resumed.printRequestsUpdated;
          designIssueReportsUpdated = resumed.designIssueReportsUpdated;
        } else {
          propagationComplete = propagation.complete;
          propagationStatus = propagation.status;
          printRequestsUpdated = propagation.printRequestsUpdated;
          designIssueReportsUpdated = propagation.designIssueReportsUpdated;
        }
      } else {
        const existingPropagation = customerSnapshot.data()?.identitySnapshotPropagation;
        if (
          existingPropagation &&
          (existingPropagation.status === "in_progress" || existingPropagation.status === "failed")
        ) {
          const resumed = await resumeCustomerIdentitySnapshotPropagation(payload.customerId);
          propagationComplete = resumed.complete;
          propagationStatus = resumed.status;
          printRequestsUpdated = resumed.printRequestsUpdated;
          designIssueReportsUpdated = resumed.designIssueReportsUpdated;
        }
      }
    } catch (propagationError) {
      propagationComplete = false;
      propagationStatus = "failed";
      propagationWarning =
        propagationError instanceof Error
          ? propagationError.message
          : "Identity snapshot propagation needs a retry.";
      console.error("Customer identity snapshot propagation failed after profile update.", {
        customerId: payload.customerId,
        usernameChanged: updateResult.usernameChanged,
        message: propagationWarning,
      });
    }

    if (!propagationComplete && propagationStatus === "failed" && !propagationWarning) {
      propagationWarning = "Identity snapshot propagation needs a retry.";
    }

    return {
      customerId: payload.customerId,
      displayName: updateResult.displayName,
      username: updateResult.username,
      email: payload.email,
      portalAuthEmailSynced,
      portalAuthDisplayNameSynced,
      usernameChanged: updateResult.usernameChanged,
      displayNameChanged: updateResult.displayNameChanged,
      propagationComplete,
      propagationStatus,
      printRequestsUpdated,
      designIssueReportsUpdated,
      propagationWarning,
    };
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }

    if (error instanceof Error && "code" in error) {
      const firebaseError = error as Error & { code?: string };

      if (firebaseError.code === "auth/email-already-exists") {
        throw alreadyExists("That email is already used by another account.");
      }
    }

    mapHttpsError(error);
  }
});
