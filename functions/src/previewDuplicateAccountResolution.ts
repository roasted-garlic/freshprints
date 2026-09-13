import { HttpsError, onCall } from "firebase-functions/v2/https";

import type {
  PreviewDuplicateAccountResolutionRequest,
  PreviewDuplicateAccountResolutionResponse,
} from "../../packages/shared/src/types/customer/customerDuplicateResolution.types";
import { validateCustomerUsername } from "../../packages/shared/src/utils/customerUsername";
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
  blockerCountsRecord,
  buildDuplicateResolutionBlockers,
  buildDuplicateResolutionCustomerIdentitySummary,
  buildDuplicateResolutionRecommendation,
  buildDuplicateResolutionSummaryLines,
  buildUsernameReservationSummary,
  hasPreservedCustomerHistory,
  loadCustomerDocumentEmail,
  loadAuthIdentityEmailEvidence,
  loadUsernameReservationOwner,
} from "./lib/customerDuplicateResolutionHelpers";
import { loadCustomerEligibilitySnapshot } from "./lib/customerIdentityEligibilitySnapshot";
import { storeCustomerIdentityPreview } from "./lib/customerIdentityOperationPreview";
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
    throw permissionDenied("Only owners can preview duplicate account resolution.");
  }
}

function mapHttpsError(error: unknown): never {
  if (error instanceof HttpsError) {
    throw error;
  }
  if (error instanceof Error) {
    const message = error.message.trim() || "Unable to preview duplicate resolution right now.";
    if (/not found/i.test(message)) {
      throw invalidArgument(message);
    }
    if (/in progress|cannot use this identity/i.test(message)) {
      throw failedPrecondition(message);
    }
    throw internal(message);
  }
  throw internal("Unable to preview duplicate resolution right now.");
}

function parsePreviewRequest(data: unknown): PreviewDuplicateAccountResolutionRequest {
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
      : undefined;

  if (!sourceCustomerId || !survivorCustomerId) {
    throw invalidArgument("Select both source and survivor customer accounts.");
  }

  if (sourceCustomerId === survivorCustomerId) {
    throw invalidArgument("Source and survivor must be different customer accounts.");
  }

  return { sourceCustomerId, survivorCustomerId, desiredUsername };
}

export const previewDuplicateAccountResolution = onCall(
  async (request): Promise<PreviewDuplicateAccountResolutionResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      const caller = await loadCallerProfile(request.auth.uid);
      assertOwnerCaller(caller);

      const payload = parsePreviewRequest(request.data);
      const [sourceSnapshot, survivorSnapshot] = await Promise.all([
        loadCustomerEligibilitySnapshot(payload.sourceCustomerId),
        loadCustomerEligibilitySnapshot(payload.survivorCustomerId),
      ]);

      assertCustomerEligibleForIdentityMutation(sourceSnapshot, "username_transfer");
      assertCustomerEligibleForIdentityMutation(survivorSnapshot, "username_transfer");

      const desiredUsernameInput =
        payload.desiredUsername?.trim() || sourceSnapshot.username || "";
      const desiredResult = validateCustomerUsername(desiredUsernameInput);
      if (!desiredResult.isValid) {
        throw invalidArgument(desiredResult.error ?? "Enter a valid desired username.");
      }
      const desiredUsername = desiredResult.username;

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
        loadUsernameReservationOwner(desiredUsername),
        loadAuthIdentityEmailEvidence(sourceSnapshot.authUid),
        loadAuthIdentityEmailEvidence(survivorSnapshot.authUid),
      ]);

      const continuableEvaluation = evaluateContinuablePrintRequestBlockers({
        sourceContinuable,
        survivorContinuable,
      });

      const [sourceIdentity, survivorIdentity] = await Promise.all([
        buildDuplicateResolutionCustomerIdentitySummary(sourceSnapshot, sourceEmail),
        buildDuplicateResolutionCustomerIdentitySummary(survivorSnapshot, survivorEmail),
      ]);

      const verification = resolveDuplicateVerification({
        sourceCustomerId: payload.sourceCustomerId,
        survivorCustomerId: payload.survivorCustomerId,
        sourceCustomerEmail: sourceEmail,
        survivorCustomerEmail: survivorEmail,
        sourceAuth,
        survivorAuth,
      });

      const reservationSummary = buildUsernameReservationSummary({
        desiredUsername,
        sourceCustomerId: payload.sourceCustomerId,
        survivorCustomerId: payload.survivorCustomerId,
        ownerCustomerId: reservationOwnerCustomerId,
      });

      const identityBlocked =
        sourceSnapshot.isDeleted ||
        sourceSnapshot.isMerged ||
        survivorSnapshot.isDeleted ||
        survivorSnapshot.isMerged ||
        sourceSnapshot.hasIdentityOperationLock ||
        survivorSnapshot.hasIdentityOperationLock;

      const verificationBlocked = verification.status === "blocked";
      const hasHistory =
        hasPreservedCustomerHistory(sourceSnapshot.blockerCounts) ||
        hasPreservedCustomerHistory(survivorSnapshot.blockerCounts);

      const recommendation = buildDuplicateResolutionRecommendation({
        identityBlocked,
        continuableBlocked: continuableEvaluation.blocked,
        verificationBlocked,
        reservationOwnedBySource: reservationSummary.ownedBySource,
        sourceIsDisabled: sourceSnapshot.isDisabled,
        hasPreservedHistory: hasHistory,
      });

      const blockers = buildDuplicateResolutionBlockers({
        sourceSnapshot,
        survivorSnapshot,
        continuableBlockers: continuableEvaluation.blockers,
        reservationSummary,
        verificationBlocked,
        verificationReasons: verification.reasons,
      });

      const previewChecksum = buildDuplicateResolutionPreviewChecksum({
        sourceSnapshot,
        survivorSnapshot,
        desiredUsername,
        sourceContinuable,
        survivorContinuable,
        reservationOwnerCustomerId,
      });

      const verificationMode = verification.mode ?? "owner_attested";
      const { previewId, previewExpiresAtMillis } = await storeCustomerIdentityPreview({
        sourceCustomerId: payload.sourceCustomerId,
        survivorCustomerId: payload.survivorCustomerId,
        desiredUsername,
        verificationMode,
        previewChecksum,
        createdBy: caller.id,
        operation: "duplicate_resolution",
      });

      const previewAllowed =
        !identityBlocked &&
        !continuableEvaluation.blocked &&
        !verificationBlocked &&
        reservationSummary.ownedBySource;

      const previewMetadata = withoutUndefinedFields({
        previewChecksum,
        previewId,
        sourceCustomerId: payload.sourceCustomerId,
        survivorCustomerId: payload.survivorCustomerId,
        desiredUsername,
        verificationStatus: verification.status,
        verificationMode: verification.mode ?? undefined,
        blockerCodes: blockers.map((blocker) => blocker.code),
      });

      await Promise.all([
        appendCustomerActivityEvent({
          customerId: payload.sourceCustomerId,
          eventType: "account.duplicate_resolution_previewed",
          actorUid: caller.id,
          actorRole: "owner",
          result: previewAllowed ? "success" : "blocked",
          metadata: previewMetadata,
        }),
        appendCustomerActivityEvent({
          customerId: payload.survivorCustomerId,
          eventType: "account.duplicate_resolution_previewed",
          actorUid: caller.id,
          actorRole: "owner",
          result: previewAllowed ? "success" : "blocked",
          metadata: previewMetadata,
        }),
      ]);

      return {
        outcome: previewAllowed ? "allowed" : "blocked",
        source: sourceIdentity,
        survivor: survivorIdentity,
        desiredUsername,
        usernameReservation: reservationSummary,
        sourceContinuablePrintRequests: sourceContinuable,
        survivorContinuablePrintRequests: survivorContinuable,
        sourceHistoryBlockerCounts: blockerCountsRecord(sourceSnapshot.blockerCounts),
        survivorHistoryBlockerCounts: blockerCountsRecord(survivorSnapshot.blockerCounts),
        verification: {
          status: verification.status,
          mode: verification.mode,
          reasons: verification.reasons,
          requiresOwnerAttestation: verification.requiresOwnerAttestation,
          requiresOwnerVerificationReason: verification.requiresOwnerVerificationReason,
        },
        recommendation,
        blockers,
        plannedSourceDisposition: "transfer_and_disable",
        resolutionSummaryLines: buildDuplicateResolutionSummaryLines({
          desiredUsername,
          priorSurvivorUsername: survivorSnapshot.username,
          sourceIsDisabled: sourceSnapshot.isDisabled,
        }),
        previewId,
        previewChecksum,
        previewExpiresAtMillis,
      };
    } catch (error) {
      mapHttpsError(error);
    }
  },
);
