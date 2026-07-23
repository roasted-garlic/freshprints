import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import {
  TOMBSTONE_CUSTOMER_CONFIRMATION_PHRASE,
  type PreviewCustomerAccountDeletionRequest,
  type PreviewCustomerAccountDeletionResponse,
  type TombstoneCustomerAccountRequest,
  type TombstoneCustomerAccountResponse,
} from "../../packages/shared/src/types/deletion/deletion.types";
import { adminAuth, adminDb } from "./lib/admin";
import { loadCallerProfile } from "./lib/caller";
import {
  failedPrecondition,
  invalidArgument,
  permissionDenied,
  unauthenticated,
} from "./lib/errors";

function assertOwnerCaller(caller: Awaited<ReturnType<typeof loadCallerProfile>>): void {
  if (!caller.isActive || caller.role !== "owner") {
    throw permissionDenied("Only owners can delete customer accounts.");
  }
}

function mapHttpsError(error: unknown): never {
  if (error instanceof HttpsError) {
    throw error;
  }
  if (error instanceof Error) {
    throw invalidArgument(error.message);
  }
  throw failedPrecondition("Unable to process customer account deletion right now.");
}

function parseCustomerId(data: unknown): string {
  if (!data || typeof data !== "object") {
    throw invalidArgument("Request data is required.");
  }
  const customerId =
    "customerId" in data && typeof data.customerId === "string" ? data.customerId.trim() : "";
  if (!customerId) {
    throw invalidArgument("Select a customer to delete.");
  }
  return customerId;
}

function parseTombstoneRequest(data: unknown): TombstoneCustomerAccountRequest {
  const customerId = parseCustomerId(data);
  const confirmationPhrase =
    data &&
    typeof data === "object" &&
    "confirmationPhrase" in data &&
    typeof data.confirmationPhrase === "string"
      ? data.confirmationPhrase.trim()
      : "";
  if (confirmationPhrase !== TOMBSTONE_CUSTOMER_CONFIRMATION_PHRASE) {
    throw invalidArgument(
      `Confirmation phrase must be exactly "${TOMBSTONE_CUSTOMER_CONFIRMATION_PHRASE}".`,
    );
  }
  return { customerId, confirmationPhrase };
}

async function countPrintRequestsByStatus(
  customerId: string,
): Promise<{ openRequestCount: number; historicalRequestCount: number }> {
  const snapshot = await adminDb
    .collection("printRequests")
    .where("customerId", "==", customerId)
    .get();

  let openRequestCount = 0;
  let historicalRequestCount = 0;
  for (const doc of snapshot.docs) {
    const status = doc.data().status;
    if (status === "draft" || status === "active" || status === "editing") {
      openRequestCount += 1;
    } else {
      historicalRequestCount += 1;
    }
  }
  return { openRequestCount, historicalRequestCount };
}

async function buildPreview(
  customerId: string,
): Promise<PreviewCustomerAccountDeletionResponse> {
  const customerSnap = await adminDb.collection("customers").doc(customerId).get();
  if (!customerSnap.exists) {
    throw invalidArgument("Customer not found.");
  }

  const data = customerSnap.data() ?? {};
  const username =
    typeof data.username === "string" && data.username.trim()
      ? data.username.trim().toLowerCase()
      : null;
  const displayName =
    typeof data.displayName === "string" && data.displayName.trim()
      ? data.displayName.trim()
      : "Customer";
  const authUid =
    typeof data.userId === "string" && data.userId.trim() ? data.userId.trim() : null;
  const alreadyDeleted = data.isDeleted === true;
  const { openRequestCount, historicalRequestCount } = await countPrintRequestsByStatus(customerId);

  const notes: string[] = [
    "The customer will not be able to sign in or create new activity.",
    "The username stays reserved and will display with (Deleted).",
    "All print requests and show history remain for staff to complete, cancel, or archive.",
  ];

  if (alreadyDeleted) {
    return {
      outcome: "already_done",
      blockers: [],
      entityLabel: displayName,
      confirmLabel: undefined,
      notes: ["This customer account is already deleted."],
      customerId,
      username,
      displayName,
      hasAuthAccount: Boolean(authUid),
      openRequestCount,
      historicalRequestCount,
      alreadyDeleted: true,
    };
  }

  return {
    outcome: "tombstone",
    blockers: [],
    entityLabel: displayName,
    confirmLabel: "Disable customer account",
    notes,
    customerId,
    username,
    displayName,
    hasAuthAccount: Boolean(authUid),
    openRequestCount,
    historicalRequestCount,
    alreadyDeleted: false,
  };
}

export const previewCustomerAccountDeletion = onCall(
  async (request): Promise<PreviewCustomerAccountDeletionResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    try {
      const caller = await loadCallerProfile(request.auth.uid);
      assertOwnerCaller(caller);
      const customerId = parseCustomerId(request.data as PreviewCustomerAccountDeletionRequest);
      return await buildPreview(customerId);
    } catch (error) {
      mapHttpsError(error);
    }
  },
);

export const tombstoneCustomerAccount = onCall(
  async (request): Promise<TombstoneCustomerAccountResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      const caller = await loadCallerProfile(request.auth.uid);
      assertOwnerCaller(caller);
      const payload = parseTombstoneRequest(request.data);

      const customerRef = adminDb.collection("customers").doc(payload.customerId);
      const customerSnap = await customerRef.get();
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

      if (authUid && authUid === request.auth.uid) {
        throw invalidArgument("You cannot delete your own account.");
      }

      if (data.isDeleted === true) {
        return {
          outcome: "already_done",
          message: "This customer account is already deleted.",
          entityId: payload.customerId,
          customerId: payload.customerId,
          authUidDisabled: authUid,
          authDisableFailed: false,
          username,
        };
      }

      let deletionSource: "studio_owner" | "portal_request" = "studio_owner";
      if (authUid) {
        const deletionReq = await adminDb.collection("accountDeletionRequests").doc(authUid).get();
        if (deletionReq.exists && deletionReq.data()?.status === "pending") {
          deletionSource = "portal_request";
        }
      }

      const now = FieldValue.serverTimestamp();
      const batch = adminDb.batch();

      batch.set(
        customerRef,
        {
          isDeleted: true,
          deletedAt: now,
          deletedBy: request.auth.uid,
          deletionSource,
          updatedAt: now,
        },
        { merge: true },
      );

      if (authUid) {
        const userRef = adminDb.collection("users").doc(authUid);
        batch.set(
          userRef,
          {
            isActive: false,
            isDeleted: true,
            deletedAt: now,
            deletedBy: request.auth.uid,
            deletionSource,
            updatedAt: now,
            updatedBy: request.auth.uid,
          },
          { merge: true },
        );

        const deletionRef = adminDb.collection("accountDeletionRequests").doc(authUid);
        const deletionSnap = await deletionRef.get();
        if (deletionSnap.exists) {
          batch.set(
            deletionRef,
            {
              status: "fulfilled",
              updatedAt: now,
              fulfilledAt: now,
              fulfilledBy: request.auth.uid,
            },
            { merge: true },
          );
        }

        batch.set(
          customerRef,
          {
            accountDeletionRequest: {
              status: "fulfilled",
              requestedAt: deletionSnap.exists
                ? (deletionSnap.data()?.requestedAt ?? now)
                : now,
              updatedAt: now,
            },
          },
          { merge: true },
        );
      }

      await batch.commit();

      // Username reservation intentionally retained — do not delete customerUsernames/{username}.

      let authDisableFailed = false;
      let authUidDisabled: string | null = null;
      if (authUid) {
        try {
          await adminAuth.updateUser(authUid, { disabled: true });
          authUidDisabled = authUid;
        } catch (error) {
          authDisableFailed = true;
          console.error("Failed to disable Auth user for tombstoned customer.", {
            uid: authUid,
            message: error instanceof Error ? error.message : "unknown",
          });
        }
      }

      return {
        outcome: "tombstone",
        message: authDisableFailed
          ? "Customer marked deleted, but sign-in disable failed. Retry or check Auth."
          : "Customer account disabled. History and username are preserved.",
        entityId: payload.customerId,
        customerId: payload.customerId,
        authUidDisabled,
        authDisableFailed,
        username,
      };
    } catch (error) {
      mapHttpsError(error);
    }
  },
);
