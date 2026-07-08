import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import type { UpdateCustomerResponse } from "../../packages/shared/src/types/customer/updateCustomer.types";
import { adminAuth, adminDb } from "./lib/admin";
import { loadCallerProfile } from "./lib/caller";
import {
  normalizeCustomerEmail,
  validateUpdateCustomerRequest,
} from "./lib/customerUpdateValidation";
import { alreadyExists, internal, invalidArgument, unauthenticated } from "./lib/errors";
import { withoutUndefinedFields } from "./lib/firestoreDocument";
import { assertCanManageCustomers } from "./lib/permissions";

interface CustomerRecord {
  userId?: string;
  displayName?: string;
  username?: string;
  email?: string;
  notes?: string;
  isGuest?: boolean;
  signupSource?: string;
  totalPrintRequests?: number;
  nextPrintRequestSequence?: number;
  totalRequests?: number;
  totalApprovedRequests?: number;
  usernameUpdatedAt?: FirebaseFirestore.Timestamp;
  createdAt?: FirebaseFirestore.Timestamp;
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

    const current = customerSnapshot.data() as CustomerRecord;
    const linkedUserId = typeof current.userId === "string" ? current.userId : undefined;

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

    const previousUsername = typeof current.username === "string" ? current.username : undefined;
    const usernameChanged = previousUsername !== payload.username;
    const emailChanged =
      normalizeOptionalEmail(typeof current.email === "string" ? current.email : undefined) !==
      payload.email;
    const displayNameChanged = current.displayName !== payload.displayName;
    const timestamp = FieldValue.serverTimestamp();

    await adminDb.runTransaction(async (transaction) => {
      const usernameReservationRef = adminDb.collection("customerUsernames").doc(payload.username);
      const reservationSnapshot = await transaction.get(usernameReservationRef);

      if (
        reservationSnapshot.exists &&
        reservationSnapshot.data()?.customerId !== payload.customerId
      ) {
        throw alreadyExists("That customer username is already taken.");
      }

      const previousReservationRef =
        previousUsername && previousUsername !== payload.username
          ? adminDb.collection("customerUsernames").doc(previousUsername)
          : null;

      transaction.update(
        customerRef,
        withoutUndefinedFields({
          displayName: payload.displayName,
          username: payload.username,
          email: payload.email,
          notes: payload.notes,
          usernameUpdatedAt: usernameChanged ? timestamp : current.usernameUpdatedAt,
          updatedAt: timestamp,
        }),
      );

      transaction.set(
        usernameReservationRef,
        {
          customerId: payload.customerId,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        { merge: true },
      );

      if (previousReservationRef) {
        transaction.delete(previousReservationRef);
      }

      if (linkedUserId && (emailChanged || displayNameChanged)) {
        const userRef = adminDb.collection("users").doc(linkedUserId);
        transaction.update(
          userRef,
          withoutUndefinedFields({
            email: payload.email,
            displayName: payload.displayName,
            updatedAt: timestamp,
            updatedBy: caller.id,
          }),
        );
      }
    });

    let portalAuthEmailSynced = true;

    if (linkedUserId && emailChanged && payload.email) {
      portalAuthEmailSynced = await syncPortalAuthEmail(
        linkedUserId,
        payload.email,
        payload.displayName,
      );
    } else if (linkedUserId && displayNameChanged && !emailChanged) {
      try {
        await adminAuth.updateUser(linkedUserId, {
          displayName: payload.displayName,
        });
      } catch (error) {
        console.error("Failed to sync customer display name to Firebase Auth.", {
          userId: linkedUserId,
          message: error instanceof Error ? error.message : "unknown",
        });
      }
    }

    return {
      customerId: payload.customerId,
      displayName: payload.displayName,
      username: payload.username,
      email: payload.email,
      portalAuthEmailSynced,
      usernameChanged,
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
