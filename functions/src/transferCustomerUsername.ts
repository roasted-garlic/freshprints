import { HttpsError, onCall } from "firebase-functions/v2/https";

import { TRANSFER_USERNAME_CONFIRMATION_PHRASE } from "../../packages/shared/src/constants/customerIdentityConfirmationPhrases";
import type {
  TransferCustomerUsernameRequest,
  TransferCustomerUsernameResponse,
} from "../../packages/shared/src/types/customer/customerDuplicateResolution.types";
import { validateCustomerUsername } from "../../packages/shared/src/utils/customerUsername";
import { applyCustomerAccountDisableInternal } from "./lib/applyCustomerAccountDisableInternal";
import { loadCallerProfile } from "./lib/caller";
import { appendCustomerActivityEvent } from "./lib/customerActivityEvents";
import { assertCustomerEligibleForIdentityMutation } from "./lib/customerAccountEligibility";
import {
  evaluateContinuablePrintRequestBlockers,
  loadContinuablePortalPrintRequests,
} from "./lib/customerContinuablePrintRequests";
import {
  buildDuplicateResolutionPreviewChecksum,
  resolveDuplicateVerification,
} from "./lib/customerDuplicateVerification";
import {
  buildUsernameReservationSummary,
  loadAuthIdentityEmailEvidence,
  loadCustomerDocumentEmail,
  loadUsernameReservationOwner,
} from "./lib/customerDuplicateResolutionHelpers";
import {
  loadCustomerEligibilitySnapshot,
} from "./lib/customerIdentityEligibilitySnapshot";
import {
  clearCustomerIdentityOperationLock,
  setCustomerIdentityOperationLock,
} from "./lib/customerIdentityOperationLock";
import { consumeCustomerIdentityPreview } from "./lib/customerIdentityOperationPreview";
import {
  initializeIdentitySnapshotPropagation,
  propagateCustomerIdentitySnapshots,
} from "./lib/propagateCustomerIdentitySnapshots";
import { applyDuplicateUsernameTransferTransaction } from "./lib/customerUsernameTransfer";
import { withoutUndefinedFields } from "./lib/firestoreDocument";
import {
  failedPrecondition,
  internal,
  invalidArgument,
  permissionDenied,
  unauthenticated,
} from "./lib/errors";

function assertOwnerCaller(caller: Awaited<ReturnType<typeof loadCallerProfile>>): void {
  if (!caller.isActive || caller.role !== "owner") {
    throw permissionDenied("Only owners can transfer usernames between duplicate accounts.");
  }
}

function mapHttpsError(error: unknown): never {
  if (error instanceof HttpsError) {
    throw error;
  }
  if (error instanceof Error) {
    const message = error.message.trim() || "Unable to transfer username right now.";
    if (/not found|invalid|select/i.test(message)) {
      throw invalidArgument(message);
    }
    if (/changed since preview|in progress|reservation|cannot use this identity/i.test(message)) {
      throw failedPrecondition(message);
    }
    throw internal(message);
  }
  throw internal("Unable to transfer username right now.");
}

function parseTransferRequest(data: unknown): TransferCustomerUsernameRequest {
  if (!data || typeof data !== "object") {
    throw invalidArgument("Request data is required.");
  }

  const sourceCustomerId =
    "sourceCustomerId" in data && typeof data.sourceCustomerId === "string"
      ? data.sourceCustomerId.trim()
      : "";
  const survivorCustomerId =
    "survivorCustomerId" in data && typeof data.survivorCustomerId === "string"
      ? data.survivorCustomerId.trim()
      : "";
  const desiredUsername =
    "desiredUsername" in data && typeof data.desiredUsername === "string"
      ? data.desiredUsername.trim()
      : "";
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
  const ownerAttestedSameCustomer =
    "ownerAttestedSameCustomer" in data && data.ownerAttestedSameCustomer === true;
  const ownerVerificationReason =
    "ownerVerificationReason" in data && typeof data.ownerVerificationReason === "string"
      ? data.ownerVerificationReason.trim()
      : undefined;

  if (!sourceCustomerId || !survivorCustomerId) {
    throw invalidArgument("Select both source and survivor customer accounts.");
  }

  if (sourceCustomerId === survivorCustomerId) {
    throw invalidArgument("Source and survivor must be different customer accounts.");
  }

  if (confirmationPhrase !== TRANSFER_USERNAME_CONFIRMATION_PHRASE) {
    throw invalidArgument(
      `Confirmation phrase must be exactly "${TRANSFER_USERNAME_CONFIRMATION_PHRASE}".`,
    );
  }

  if (!previewId || !previewChecksum) {
    throw invalidArgument("A current preview is required before transferring the username.");
  }

  const desiredResult = validateCustomerUsername(desiredUsername);
  if (!desiredResult.isValid) {
    throw invalidArgument(desiredResult.error ?? "Enter a valid desired username.");
  }

  return {
    sourceCustomerId,
    survivorCustomerId,
    desiredUsername: desiredResult.username,
    confirmationPhrase,
    previewId,
    previewChecksum,
    ownerAttestedSameCustomer,
    ownerVerificationReason,
  };
}

export const transferCustomerUsername = onCall(
  async (request): Promise<TransferCustomerUsernameResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      const caller = await loadCallerProfile(request.auth.uid);
      assertOwnerCaller(caller);

      const payload = parseTransferRequest(request.data);

      await consumeCustomerIdentityPreview({
        previewId: payload.previewId,
        sourceCustomerId: payload.sourceCustomerId,
        survivorCustomerId: payload.survivorCustomerId,
        desiredUsername: payload.desiredUsername,
        previewChecksum: payload.previewChecksum,
        callerId: caller.id,
        operation: "duplicate_resolution",
      });

      const [sourceSnapshot, survivorSnapshot] = await Promise.all([
        loadCustomerEligibilitySnapshot(payload.sourceCustomerId),
        loadCustomerEligibilitySnapshot(payload.survivorCustomerId),
      ]);

      assertCustomerEligibleForIdentityMutation(sourceSnapshot, "username_transfer");
      assertCustomerEligibleForIdentityMutation(survivorSnapshot, "username_transfer");

      const [
        sourceContinuable,
        survivorContinuable,
        sourceEmail,
        survivorEmail,
        reservationOwnerCustomerId,
        sourceAuth,
        survivorAuth,
      ] = await Promise.all([
        loadContinuablePortalPrintRequests(payload.sourceCustomerId),
        loadContinuablePortalPrintRequests(payload.survivorCustomerId),
        loadCustomerDocumentEmail(payload.sourceCustomerId),
        loadCustomerDocumentEmail(payload.survivorCustomerId),
        loadUsernameReservationOwner(payload.desiredUsername),
        loadAuthIdentityEmailEvidence(sourceSnapshot.authUid),
        loadAuthIdentityEmailEvidence(survivorSnapshot.authUid),
      ]);

      const currentChecksum = buildDuplicateResolutionPreviewChecksum({
        sourceSnapshot,
        survivorSnapshot,
        desiredUsername: payload.desiredUsername,
        sourceContinuable,
        survivorContinuable,
        reservationOwnerCustomerId,
      });

      if (currentChecksum !== payload.previewChecksum) {
        throw failedPrecondition(
          "Customer state changed since preview. Run preview again before applying.",
        );
      }

      const continuableEvaluation = evaluateContinuablePrintRequestBlockers({
        sourceContinuable,
        survivorContinuable,
      });

      if (continuableEvaluation.blocked) {
        return {
          outcome: "blocked",
          message:
            continuableEvaluation.blockers[0]?.message ??
            "Continuable print requests block Apply.",
          sourceCustomerId: payload.sourceCustomerId,
          survivorCustomerId: payload.survivorCustomerId,
          transferredUsername: payload.desiredUsername,
          priorSourceUsername: sourceSnapshot.username ?? "",
          priorSurvivorUsername: survivorSnapshot.username ?? "",
          sourcePlaceholderUsername: "",
          verificationMode: "owner_attested",
          previewChecksum: payload.previewChecksum,
          blockers: continuableEvaluation.blockers.map((blocker) => ({
            code: blocker.code,
            message: blocker.message,
          })),
        };
      }

      const reservationSummary = buildUsernameReservationSummary({
        desiredUsername: payload.desiredUsername,
        sourceCustomerId: payload.sourceCustomerId,
        survivorCustomerId: payload.survivorCustomerId,
        ownerCustomerId: reservationOwnerCustomerId,
      });

      if (!reservationSummary.ownedBySource) {
        throw failedPrecondition(
          "Desired username no longer belongs to the source account. Run preview again.",
        );
      }

      const verification = resolveDuplicateVerification({
        sourceCustomerId: payload.sourceCustomerId,
        survivorCustomerId: payload.survivorCustomerId,
        sourceCustomerEmail: sourceEmail,
        survivorCustomerEmail: survivorEmail,
        sourceAuth,
        survivorAuth,
        ownerAttestedSameCustomer: payload.ownerAttestedSameCustomer,
        ownerVerificationReason: payload.ownerVerificationReason,
      });

      if (verification.status !== "verified" || !verification.mode) {
        return {
          outcome: "rejected",
          message:
            verification.status === "blocked"
              ? (verification.reasons[0] ?? "Duplicate verification failed.")
              : "Owner attestation and verification reason are required before Apply.",
          sourceCustomerId: payload.sourceCustomerId,
          survivorCustomerId: payload.survivorCustomerId,
          transferredUsername: payload.desiredUsername,
          priorSourceUsername: sourceSnapshot.username ?? "",
          priorSurvivorUsername: survivorSnapshot.username ?? "",
          sourcePlaceholderUsername: "",
          verificationMode: verification.mode ?? "owner_attested",
          previewChecksum: payload.previewChecksum,
        };
      }

      await Promise.all([
        setCustomerIdentityOperationLock(payload.sourceCustomerId, {
          kind: "username_transfer",
          lockedBy: caller.id,
          previewChecksum: payload.previewChecksum,
        }),
        setCustomerIdentityOperationLock(payload.survivorCustomerId, {
          kind: "username_transfer",
          lockedBy: caller.id,
          previewChecksum: payload.previewChecksum,
        }),
      ]);

      let transferResult;
      try {
        transferResult = await applyDuplicateUsernameTransferTransaction({
          sourceCustomerId: payload.sourceCustomerId,
          survivorCustomerId: payload.survivorCustomerId,
          desiredUsername: payload.desiredUsername,
          callerId: caller.id,
        });
      } finally {
        await Promise.all([
          clearCustomerIdentityOperationLock(payload.sourceCustomerId),
          clearCustomerIdentityOperationLock(payload.survivorCustomerId),
        ]);
      }

      const survivorDisplayName = survivorSnapshot.displayName;
      await initializeIdentitySnapshotPropagation(payload.survivorCustomerId, {
        username: transferResult.transferredUsername,
        displayName: survivorDisplayName,
      });

      let propagationStatus: "completed" | "in_progress" | "failed" = "completed";
      let propagationWarning: string | undefined;

      try {
        const propagation = await propagateCustomerIdentitySnapshots(payload.survivorCustomerId);
        propagationStatus = propagation.complete ? "completed" : "in_progress";
        if (!propagation.complete) {
          propagationWarning =
            "Username transfer succeeded. Survivor identity snapshot propagation is still in progress.";
        }
      } catch (propagationError) {
        propagationStatus = "failed";
        propagationWarning =
          propagationError instanceof Error
            ? propagationError.message
            : "Survivor identity snapshot propagation failed.";
      }

      const transferMetadata = withoutUndefinedFields({
        previewChecksum: payload.previewChecksum,
        previewId: payload.previewId,
        sourceCustomerId: payload.sourceCustomerId,
        survivorCustomerId: payload.survivorCustomerId,
        priorSourceUsername: transferResult.priorSourceUsername,
        priorSurvivorUsername: transferResult.priorSurvivorUsername,
        transferredUsername: transferResult.transferredUsername,
        sourcePlaceholderUsername: transferResult.sourcePlaceholderUsername,
        verificationMode: verification.mode,
      });

      await Promise.all([
        appendCustomerActivityEvent({
          customerId: payload.sourceCustomerId,
          eventType: "account.username_transferred",
          actorUid: caller.id,
          actorRole: "owner",
          result: "success",
          metadata: transferMetadata,
        }),
        appendCustomerActivityEvent({
          customerId: payload.survivorCustomerId,
          eventType: "account.username_transferred",
          actorUid: caller.id,
          actorRole: "owner",
          result: "success",
          metadata: transferMetadata,
        }),
      ]);

      let sourceDisableOutcome: "success" | "failed" | "skipped" = "skipped";
      let sourceDisableMessage = "Source account was already disabled.";
      let authDisableFailed = false;

      if (!sourceSnapshot.isDisabled) {
        const disableResult = await applyCustomerAccountDisableInternal({
          customerId: payload.sourceCustomerId,
          callerId: caller.id,
          reason: "Duplicate account resolved — username transferred to survivor.",
        });

        if (disableResult.outcome === "success" || disableResult.outcome === "already_done") {
          sourceDisableOutcome = "success";
          sourceDisableMessage = disableResult.message;
        } else {
          sourceDisableOutcome = "failed";
          sourceDisableMessage = disableResult.message;
          authDisableFailed = disableResult.authDisableFailed;
        }
      }

      if (sourceDisableOutcome === "failed") {
        return {
          outcome: "partial_success",
          message:
            "Username transferred successfully, but disabling the source account failed. Retry disable on the source account.",
          sourceCustomerId: payload.sourceCustomerId,
          survivorCustomerId: payload.survivorCustomerId,
          transferredUsername: transferResult.transferredUsername,
          priorSourceUsername: transferResult.priorSourceUsername,
          priorSurvivorUsername: transferResult.priorSurvivorUsername,
          sourcePlaceholderUsername: transferResult.sourcePlaceholderUsername,
          verificationMode: verification.mode,
          previewChecksum: payload.previewChecksum,
          propagationStatus,
          propagationWarning,
          sourceDisableOutcome,
          sourceDisableMessage,
          authDisableFailed,
        };
      }

      return {
        outcome: "success",
        message: "Username transferred and source account disabled.",
        sourceCustomerId: payload.sourceCustomerId,
        survivorCustomerId: payload.survivorCustomerId,
        transferredUsername: transferResult.transferredUsername,
        priorSourceUsername: transferResult.priorSourceUsername,
        priorSurvivorUsername: transferResult.priorSurvivorUsername,
        sourcePlaceholderUsername: transferResult.sourcePlaceholderUsername,
        verificationMode: verification.mode,
        previewChecksum: payload.previewChecksum,
        propagationStatus,
        propagationWarning,
        sourceDisableOutcome,
        sourceDisableMessage,
      };
    } catch (error) {
      mapHttpsError(error);
    }
  },
);
