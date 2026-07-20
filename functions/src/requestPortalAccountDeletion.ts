import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import type {
  CancelPortalAccountDeletionRequestResponse,
  RequestPortalAccountDeletionResponse,
} from "../../packages/shared/src/types/account/portalAccountSettings.types";
import { adminAuth, adminDb } from "./lib/admin";
import { internal, invalidArgument, unauthenticated } from "./lib/errors";
import { validateDeletionConfirmation } from "./lib/portalAccountSettingsValidation";
import { requirePortalCustomer } from "./lib/portalCustomer";

function mapHttpsError(error: unknown): never {
  if (error instanceof HttpsError) {
    throw error;
  }

  if (error instanceof Error) {
    throw invalidArgument(error.message);
  }

  throw internal("Unable to update your account deletion request right now.");
}

export const requestPortalAccountDeletion = onCall(
  async (request): Promise<RequestPortalAccountDeletionResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      validateDeletionConfirmation(
        request.data && typeof request.data === "object"
          ? (request.data as { confirmation?: unknown }).confirmation
          : undefined,
      );

      const portalCustomer = await requirePortalCustomer(request.auth.uid);
      const authUser = await adminAuth.getUser(request.auth.uid);
      const email =
        typeof authUser.email === "string" ? authUser.email.trim().toLowerCase() : "";

      const deletionRef = adminDb.collection("accountDeletionRequests").doc(portalCustomer.userId);
      const customerRef = adminDb.collection("customers").doc(portalCustomer.customerId);
      const userRef = adminDb.collection("users").doc(portalCustomer.userId);

      const existing = await deletionRef.get();
      if (existing.exists && existing.data()?.status === "pending") {
        return { status: "pending", alreadyPending: true };
      }

      const now = FieldValue.serverTimestamp();
      const batch = adminDb.batch();
      batch.set(deletionRef, {
        id: portalCustomer.userId,
        userId: portalCustomer.userId,
        customerId: portalCustomer.customerId,
        email,
        displayName: portalCustomer.displayName,
        username: portalCustomer.username,
        status: "pending",
        requestedAt: now,
        updatedAt: now,
      });
      batch.set(
        customerRef,
        {
          accountDeletionRequest: {
            status: "pending",
            requestedAt: now,
            updatedAt: now,
          },
          updatedAt: now,
        },
        { merge: true },
      );
      batch.set(
        userRef,
        {
          accountDeletionRequest: {
            status: "pending",
            requestedAt: now,
            updatedAt: now,
          },
          updatedAt: now,
          updatedBy: portalCustomer.userId,
        },
        { merge: true },
      );
      await batch.commit();

      return { status: "pending", alreadyPending: false };
    } catch (error) {
      mapHttpsError(error);
    }
  },
);

export const cancelPortalAccountDeletionRequest = onCall(
  async (request): Promise<CancelPortalAccountDeletionRequestResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      const portalCustomer = await requirePortalCustomer(request.auth.uid);
      const deletionRef = adminDb.collection("accountDeletionRequests").doc(portalCustomer.userId);
      const customerRef = adminDb.collection("customers").doc(portalCustomer.customerId);
      const userRef = adminDb.collection("users").doc(portalCustomer.userId);

      const existing = await deletionRef.get();
      if (!existing.exists || existing.data()?.status !== "pending") {
        return { status: "none" };
      }

      const now = FieldValue.serverTimestamp();
      const batch = adminDb.batch();
      batch.set(
        deletionRef,
        {
          status: "cancelled",
          updatedAt: now,
          cancelledAt: now,
        },
        { merge: true },
      );
      batch.set(
        customerRef,
        {
          accountDeletionRequest: {
            status: "cancelled",
            requestedAt: existing.data()?.requestedAt ?? now,
            updatedAt: now,
          },
          updatedAt: now,
        },
        { merge: true },
      );
      batch.set(
        userRef,
        {
          accountDeletionRequest: {
            status: "cancelled",
            requestedAt: existing.data()?.requestedAt ?? now,
            updatedAt: now,
          },
          updatedAt: now,
          updatedBy: portalCustomer.userId,
        },
        { merge: true },
      );
      await batch.commit();

      return { status: "cancelled" };
    } catch (error) {
      mapHttpsError(error);
    }
  },
);
