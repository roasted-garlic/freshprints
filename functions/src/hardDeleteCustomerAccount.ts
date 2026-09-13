import { HttpsError, onCall } from "firebase-functions/v2/https";

import { HARD_DELETE_CUSTOMER_CONFIRMATION_PHRASE } from "../../packages/shared/src/constants/customerIdentityConfirmationPhrases";
import type {
  HardDeleteCustomerAccountRequest,
  HardDeleteCustomerAccountResponse,
  PreviewHardDeleteCustomerAccountRequest,
  PreviewHardDeleteCustomerAccountResponse,
} from "../../packages/shared/src/types/customer/customerIdentityManagement.types";
import type { DeletionCallableWarmupResponse } from "../../packages/shared/src/types/deletion/deletionWarmup.types";
import { loadCallerProfile } from "./lib/caller";
import { appendCustomerActivityEvent } from "./lib/customerActivityEvents";
import { withoutUndefinedFields } from "./lib/firestoreDocument";
import {
  hardDeleteCustomerIdentityBootstrap,
  markCustomerHardDeleteStarted,
} from "./lib/customerAccountIdentityBootstrapDeletion";
import { assertCustomerEligibleForIdentityMutation } from "./lib/customerAccountEligibility";
import {
  buildEligibilityChecksumFromSnapshot,
  loadCustomerEligibilitySnapshot,
} from "./lib/customerIdentityEligibilitySnapshot";
import { assertHardDeleteAllowedProject } from "./lib/customerIdentityProjectGate";
import { storeCustomerIdentityPreview, consumeCustomerIdentityPreview } from "./lib/customerIdentityOperationPreview";
import { deletionWarmupOk, isDeletionCallableWarmupRequest } from "./lib/deletionWarmup";
import {
  failedPrecondition,
  internal,
  invalidArgument,
  permissionDenied,
  unauthenticated,
} from "./lib/errors";

function assertOwnerCaller(caller: Awaited<ReturnType<typeof loadCallerProfile>>): void {
  if (!caller.isActive || caller.role !== "owner") {
    throw permissionDenied("Only owners can permanently delete customer accounts.");
  }
}

function mapHttpsError(error: unknown): never {
  if (error instanceof HttpsError) {
    throw error;
  }
  if (error instanceof Error) {
    const message = error.message.trim() || "Unable to process customer hard delete right now.";
    if (/not found/i.test(message)) {
      throw invalidArgument(message);
    }
    if (/in progress|cannot be restored|cannot use this identity/i.test(message)) {
      throw failedPrecondition(message);
    }
    throw internal(message);
  }
  throw internal("Unable to process customer hard delete right now.");
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

function blockerCountsRecord(
  counts: import("./lib/customerAccountEligibility").CustomerHistoryBlockerCounts,
): Record<string, number> {
  return { ...counts };
}

export const previewHardDeleteCustomerAccount = onCall(
  async (
    request,
  ): Promise<PreviewHardDeleteCustomerAccountResponse | DeletionCallableWarmupResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      const caller = await loadCallerProfile(request.auth.uid);
      assertOwnerCaller(caller);
      if (isDeletionCallableWarmupRequest(request.data)) {
        return deletionWarmupOk();
      }

      const customerId = parseCustomerId(request.data as PreviewHardDeleteCustomerAccountRequest);
      const snapshot = await loadCustomerEligibilitySnapshot(customerId);
      const previewChecksum = buildEligibilityChecksumFromSnapshot(snapshot);
      const { previewId, previewExpiresAtMillis } = await storeCustomerIdentityPreview({
        customerId,
        previewChecksum,
        createdBy: caller.id,
        operation: "hard_delete",
      });

      await appendCustomerActivityEvent({
        customerId,
        eventType: "account.hard_delete_previewed",
        actorUid: caller.id,
        actorRole: "owner",
        result: snapshot.eligibleForHardDelete ? "success" : "blocked",
        metadata: withoutUndefinedFields({
          previewChecksum,
          previewId,
          blockerCodes: snapshot.blockers.map((blocker) => blocker.code),
        }),
      });

      if (snapshot.eligibleForHardDelete) {
        return {
          outcome: "allowed_hard_delete",
          blockers: [],
          entityLabel: snapshot.displayName,
          confirmLabel: "Delete customer permanently",
          notes: [
            "This removes the customer account and releases the username.",
            "This action cannot be undone.",
            "Only identity/bootstrap records are removed — no business history exists.",
          ],
          customerId,
          previewId,
          previewChecksum,
          previewExpiresAtMillis,
          username: snapshot.username,
          displayName: snapshot.displayName,
          hasAuthAccount: Boolean(snapshot.authUid),
          blockerCounts: blockerCountsRecord(snapshot.blockerCounts),
          alreadyDeleted: false,
          isTombstoned: snapshot.isDeleted,
          isDisabled: snapshot.isDisabled,
          isMerged: snapshot.isMerged,
        };
      }

      return {
        outcome: "blocked",
        blockers: snapshot.blockers,
        entityLabel: snapshot.displayName,
        notes: [
          "This customer has history that must be preserved. Merge or disable this account instead.",
        ],
        customerId,
        previewId,
        previewChecksum,
        previewExpiresAtMillis,
        username: snapshot.username,
        displayName: snapshot.displayName,
        hasAuthAccount: Boolean(snapshot.authUid),
        blockerCounts: blockerCountsRecord(snapshot.blockerCounts),
        alreadyDeleted: false,
        isTombstoned: snapshot.isDeleted,
        isDisabled: snapshot.isDisabled,
        isMerged: snapshot.isMerged,
      };
    } catch (error) {
      mapHttpsError(error);
    }
  },
);

function parseHardDeleteRequest(data: unknown): HardDeleteCustomerAccountRequest {
  if (!data || typeof data !== "object") {
    throw invalidArgument("Request data is required.");
  }

  const customerId = parseCustomerId(data);
  const confirmationPhrase =
    "confirmationPhrase" in data && typeof data.confirmationPhrase === "string"
      ? data.confirmationPhrase.trim()
      : "";
  const previewId =
    "previewId" in data && typeof data.previewId === "string" ? data.previewId.trim() : "";
  const previewChecksum =
    "previewChecksum" in data && typeof data.previewChecksum === "string"
      ? data.previewChecksum.trim()
      : "";

  if (confirmationPhrase !== HARD_DELETE_CUSTOMER_CONFIRMATION_PHRASE) {
    throw invalidArgument(
      `Confirmation phrase must be exactly "${HARD_DELETE_CUSTOMER_CONFIRMATION_PHRASE}".`,
    );
  }

  if (!previewId || !previewChecksum) {
    throw invalidArgument("A current preview is required before permanent deletion.");
  }

  return { customerId, confirmationPhrase, previewId, previewChecksum };
}

export const hardDeleteCustomerAccount = onCall(
  async (request): Promise<HardDeleteCustomerAccountResponse | DeletionCallableWarmupResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      const projectId = assertHardDeleteAllowedProject();
      const caller = await loadCallerProfile(request.auth.uid);
      assertOwnerCaller(caller);
      if (isDeletionCallableWarmupRequest(request.data)) {
        return deletionWarmupOk();
      }

      const payload = parseHardDeleteRequest(request.data);

      await consumeCustomerIdentityPreview({
        previewId: payload.previewId,
        customerId: payload.customerId,
        previewChecksum: payload.previewChecksum,
        callerId: caller.id,
        operation: "hard_delete",
      });

      const snapshot = await loadCustomerEligibilitySnapshot(payload.customerId);
      const currentChecksum = buildEligibilityChecksumFromSnapshot(snapshot);

      if (currentChecksum !== payload.previewChecksum) {
        throw failedPrecondition(
          "Customer state changed since preview. Run preview again before applying.",
        );
      }

      assertCustomerEligibleForIdentityMutation(snapshot, "hard_delete");

      if (!snapshot.eligibleForHardDelete) {
        return {
          outcome: "blocked",
          message:
            "This customer has history that must be preserved. Merge or disable this account instead.",
          customerId: payload.customerId,
          previewChecksum: payload.previewChecksum,
          authUidDeleted: null,
          usernameReleased: null,
          deleted: {},
          blockers: snapshot.blockers,
        };
      }

      if (snapshot.authUid && snapshot.authUid === request.auth.uid) {
        throw invalidArgument("You cannot delete your own account.");
      }

      await markCustomerHardDeleteStarted(
        payload.customerId,
        caller.id,
        payload.previewChecksum,
      );

      const result = await hardDeleteCustomerIdentityBootstrap({
        customerId: payload.customerId,
        authUid: snapshot.authUid,
        username: snapshot.username,
      });

      await appendCustomerActivityEvent({
        customerId: payload.customerId,
        eventType: "account.hard_delete_applied",
        actorUid: caller.id,
        actorRole: "owner",
        result: "success",
        metadata: {
          previewChecksum: payload.previewChecksum,
          previewId: payload.previewId,
          projectId,
        },
      });

      return {
        outcome: "allowed_hard_delete",
        message: "Customer account permanently deleted.",
        customerId: payload.customerId,
        previewChecksum: payload.previewChecksum,
        authUidDeleted: snapshot.authUid,
        usernameReleased: snapshot.username,
        deleted: result.deleted,
      };
    } catch (error) {
      mapHttpsError(error);
    }
  },
);
