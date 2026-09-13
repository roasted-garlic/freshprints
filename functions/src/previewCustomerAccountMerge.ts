import { HttpsError, onCall } from "firebase-functions/v2/https";

import type {
  PreviewCustomerAccountMergeRequest,
  PreviewCustomerAccountMergeResponse,
} from "../../packages/shared/src/types/customer/customerAccountMerge.types";
import { loadCallerProfile } from "./lib/caller";
import { appendCustomerActivityEvent } from "./lib/customerActivityEvents";
import { assertCustomerEligibleForIdentityMutation } from "./lib/customerAccountEligibility";
import {
  buildDuplicateResolutionCustomerIdentitySummary,
  loadAuthIdentityEmailEvidence,
  loadCustomerDocumentEmail,
} from "./lib/customerDuplicateResolutionHelpers";
import { resolveDuplicateVerification } from "./lib/customerDuplicateVerification";
import { collectMergeInventoryCounts } from "./lib/customerAccountMergeInventory";
import {
  buildAccountMergeBlockers,
  buildAccountMergePreviewChecksum,
  buildAccountMergePreviewResponse,
  buildAccountMergeRecommendation,
} from "./lib/customerAccountMergePreview";
import { loadCustomerEligibilitySnapshot } from "./lib/customerIdentityEligibilitySnapshot";
import { storeCustomerIdentityPreview } from "./lib/customerIdentityOperationPreview";
import {
  evaluateMergeContinuablePolicy,
  loadContinuablePortalPrintRequestsWithItemCounts,
} from "./lib/customerMergeContinuablePrintRequests";
import { buildMergeSourcePlaceholderUsername } from "./lib/customerMergeUsername";
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
    throw permissionDenied("Only owners can preview customer account merges.");
  }
}

function mapHttpsError(error: unknown): never {
  if (error instanceof HttpsError) {
    throw error;
  }
  if (error instanceof Error) {
    const message = error.message.trim() || "Unable to preview account merge right now.";
    if (/not found/i.test(message)) {
      throw invalidArgument(message);
    }
    if (/in progress|cannot use this identity/i.test(message)) {
      throw failedPrecondition(message);
    }
    throw internal(message);
  }
  throw internal("Unable to preview account merge right now.");
}

function parsePreviewRequest(data: unknown): PreviewCustomerAccountMergeRequest {
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
  const useSourceUsername = "useSourceUsername" in data && data.useSourceUsername === true;

  if (!sourceCustomerId || !survivorCustomerId) {
    throw invalidArgument("Select both source and survivor customer accounts.");
  }

  if (sourceCustomerId === survivorCustomerId) {
    throw invalidArgument("Source and survivor must be different customer accounts.");
  }

  return { sourceCustomerId, survivorCustomerId, useSourceUsername };
}

export const previewCustomerAccountMerge = onCall(
  async (request): Promise<PreviewCustomerAccountMergeResponse> => {
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

      assertCustomerEligibleForIdentityMutation(sourceSnapshot, "merge");
      assertCustomerEligibleForIdentityMutation(survivorSnapshot, "merge");

      const useSourceUsername = payload.useSourceUsername === true;
      const plannedSurvivorUsername = useSourceUsername
        ? (sourceSnapshot.username ?? "")
        : (survivorSnapshot.username ?? sourceSnapshot.username ?? "");

      if (!plannedSurvivorUsername) {
        throw invalidArgument("Survivor must have a planned username before merge.");
      }

      const sourcePlaceholderUsername = sourceSnapshot.username
        ? buildMergeSourcePlaceholderUsername(payload.sourceCustomerId)
        : null;

      const [
        sourceContinuable,
        survivorContinuable,
        sourceEmail,
        survivorEmail,
        sourceAuth,
        survivorAuth,
        inventory,
      ] = await Promise.all([
        loadContinuablePortalPrintRequestsWithItemCounts(payload.sourceCustomerId),
        loadContinuablePortalPrintRequestsWithItemCounts(payload.survivorCustomerId),
        loadCustomerDocumentEmail(payload.sourceCustomerId),
        loadCustomerDocumentEmail(payload.survivorCustomerId),
        loadAuthIdentityEmailEvidence(sourceSnapshot.authUid),
        loadAuthIdentityEmailEvidence(survivorSnapshot.authUid),
        collectMergeInventoryCounts({
          sourceCustomerId: payload.sourceCustomerId,
          survivorCustomerId: payload.survivorCustomerId,
          sourceAuthUid: sourceSnapshot.authUid,
          survivorAuthUid: survivorSnapshot.authUid,
        }),
      ]);

      const continuablePolicy = evaluateMergeContinuablePolicy({
        source: sourceContinuable,
        survivor: survivorContinuable,
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

      const identityBlocked =
        sourceSnapshot.isDeleted ||
        sourceSnapshot.isMerged ||
        survivorSnapshot.isDeleted ||
        survivorSnapshot.isMerged ||
        sourceSnapshot.hasIdentityOperationLock ||
        survivorSnapshot.hasIdentityOperationLock;

      const verificationBlocked = verification.status === "blocked";

      const recommendation = buildAccountMergeRecommendation({
        identityBlocked,
        continuableBlocked: continuablePolicy.blocked,
        verificationBlocked,
      });

      const blockers = buildAccountMergeBlockers({
        sourceSnapshot,
        survivorSnapshot,
        continuableBlockers: continuablePolicy.blockers,
        verificationBlocked,
        verificationReasons: verification.reasons,
      });

      const previewChecksum = buildAccountMergePreviewChecksum({
        sourceSnapshot,
        survivorSnapshot,
        useSourceUsername,
        plannedSurvivorUsername,
        continuablePolicy,
        sourceInventory: inventory.source,
        survivorInventory: inventory.survivor,
        storageMigration: inventory.storageMigration,
      });

      const { previewId, previewExpiresAtMillis } = await storeCustomerIdentityPreview({
        sourceCustomerId: payload.sourceCustomerId,
        survivorCustomerId: payload.survivorCustomerId,
        useSourceUsername,
        plannedSurvivorUsername,
        previewChecksum,
        createdBy: caller.id,
        operation: "account_merge",
      });

      const previewAllowed = recommendation === "ELIGIBLE" && blockers.length === 0;

      const previewMetadata = withoutUndefinedFields({
        previewChecksum,
        previewId,
        sourceCustomerId: payload.sourceCustomerId,
        survivorCustomerId: payload.survivorCustomerId,
        useSourceUsername,
        plannedSurvivorUsername,
        verificationStatus: verification.status,
        blockerCodes: blockers.map((blocker) => blocker.code),
      });

      await Promise.all([
        appendCustomerActivityEvent({
          customerId: payload.sourceCustomerId,
          eventType: "account.merge_previewed",
          actorUid: caller.id,
          actorRole: "owner",
          result: previewAllowed ? "success" : "blocked",
          metadata: previewMetadata,
        }),
        appendCustomerActivityEvent({
          customerId: payload.survivorCustomerId,
          eventType: "account.merge_previewed",
          actorUid: caller.id,
          actorRole: "owner",
          result: previewAllowed ? "success" : "blocked",
          metadata: previewMetadata,
        }),
      ]);

      return buildAccountMergePreviewResponse({
        source: sourceIdentity,
        survivor: survivorIdentity,
        useSourceUsername,
        plannedSurvivorUsername,
        sourcePlaceholderUsername,
        sourceInventory: inventory.source,
        survivorInventory: inventory.survivor,
        storageMigration: inventory.storageMigration,
        continuablePolicy,
        verification: {
          status: verification.status,
          mode: verification.mode,
          reasons: verification.reasons,
          requiresOwnerAttestation: verification.requiresOwnerAttestation,
          requiresOwnerVerificationReason: verification.requiresOwnerVerificationReason,
        },
        recommendation,
        blockers,
        previewId,
        previewChecksum,
        previewExpiresAtMillis,
      });
    } catch (error) {
      mapHttpsError(error);
    }
  },
);
