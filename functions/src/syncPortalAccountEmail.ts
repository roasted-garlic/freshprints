import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import type { SyncPortalAccountEmailResponse } from "../../packages/shared/src/types/account/portalAccountSettings.types";
import { adminAuth, adminDb } from "./lib/admin";
import { alreadyExists, internal, invalidArgument, unauthenticated } from "./lib/errors";
import {
  isValidPortalAccountEmail,
  normalizePortalAccountEmail,
} from "./lib/portalAccountSettingsValidation";
import { requirePortalCustomer } from "./lib/portalCustomer";

function mapHttpsError(error: unknown): never {
  if (error instanceof HttpsError) {
    throw error;
  }

  if (error instanceof Error) {
    throw invalidArgument(error.message);
  }

  throw internal("Unable to sync your email right now.");
}

async function assertEmailAvailableForSelfSync(
  email: string,
  options: { userId: string; customerId: string },
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

/**
 * After Firebase Auth `verifyBeforeUpdateEmail` completes, Auth email is authoritative.
 * Syncs `users/{uid}.email` and linked `customers/{id}.email` from Admin Auth.
 */
export const syncPortalAccountEmail = onCall(
  async (request): Promise<SyncPortalAccountEmailResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      const portalCustomer = await requirePortalCustomer(request.auth.uid);
      const authUser = await adminAuth.getUser(request.auth.uid);
      const email = normalizePortalAccountEmail(authUser.email ?? "");

      if (!email || !isValidPortalAccountEmail(email)) {
        throw invalidArgument("Your signed-in account does not have a verified email to sync.");
      }

      const userRef = adminDb.collection("users").doc(portalCustomer.userId);
      const customerRef = adminDb.collection("customers").doc(portalCustomer.customerId);
      const [userSnap, customerSnap] = await Promise.all([userRef.get(), customerRef.get()]);

      const currentUserEmail = normalizePortalAccountEmail(
        typeof userSnap.data()?.email === "string" ? userSnap.data()?.email : "",
      );
      const currentCustomerEmail = normalizePortalAccountEmail(
        typeof customerSnap.data()?.email === "string" ? customerSnap.data()?.email : "",
      );

      if (currentUserEmail === email && currentCustomerEmail === email) {
        return { email, synced: false, unchanged: true };
      }

      await assertEmailAvailableForSelfSync(email, {
        userId: portalCustomer.userId,
        customerId: portalCustomer.customerId,
      });

      const batch = adminDb.batch();
      batch.set(
        userRef,
        {
          email,
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: portalCustomer.userId,
        },
        { merge: true },
      );
      batch.set(
        customerRef,
        {
          email,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      await batch.commit();

      return { email, synced: true, unchanged: false };
    } catch (error) {
      mapHttpsError(error);
    }
  },
);
