import { HttpsError, onCall } from "firebase-functions/v2/https";

import { MERGE_ACCOUNTS_CONFIRMATION_PHRASE } from "../../packages/shared/src/constants/customerIdentityConfirmationPhrases";
import type {
  ApplyCustomerAccountMergeRequest,
  ApplyCustomerAccountMergeResponse,
} from "../../packages/shared/src/types/customer/customerAccountMerge.types";
import { loadCallerProfile } from "./lib/caller";
import { appendCustomerActivityEvent } from "./lib/customerActivityEvents";
import { assertCustomerEligibleForIdentityMutation } from "./lib/customerAccountEligibility";
import {
  loadAuthIdentityEmailEvidence,
  loadCustomerDocumentEmail,
} from "./lib/customerDuplicateResolutionHelpers";
import { resolveDuplicateVerification } from "./lib/customerDuplicateVerification";
import { collectMergeInventoryCounts } from "./lib/customerAccountMergeInventory";
import { buildAccountMergePreviewChecksum } from "./lib/customerAccountMergePreview";
import {
  consumeMergePreviewOnApply,
  createCustomerMergeJob,
  getCustomerMergeJob,
  runNextMergeJobStage,
} from "./lib/customerAccountMergeJob";
import { loadCustomerEligibilitySnapshot } from "./lib/customerIdentityEligibilitySnapshot";
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
    throw permissionDenied("Only owners can merge customer accounts.");
  }
}

function mapHttpsError(error: unknown): never {
  if (error instanceof HttpsError) {
    throw error;
  }
  if (error instanceof Error) {
    const message = error.message.trim() || "Unable to apply account merge right now.";
    if (/not found|invalid|select/i.test(message)) {
      throw invalidArgument(message);
    }
    if (/changed since preview|in progress|reservation|cannot use this identity/i.test(message)) {
      throw failedPrecondition(message);
    }
    throw internal(message);
  }
  throw internal("Unable to apply account merge right now.");
}

function parseApplyRequest(data: unknown): ApplyCustomerAccountMergeRequest {
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
  const useSourceUsername = "useSourceUsername" in data && data.useSourceUsername === true;
  const ownerAttestedSameCustomer =
    "ownerAttestedSameCustomer" in data && data.ownerAttestedSameCustomer === true;
  const ownerVerificationReason =
    "ownerVerificationReason" in data && typeof data.ownerVerificationReason === "string"
      ? data.ownerVerificationReason.trim()
      : undefined;
  const jobId = "jobId" in data && typeof data.jobId === "string" ? data.jobId.trim() : undefined;

  if (!sourceCustomerId || !survivorCustomerId) {
    throw invalidArgument("Select both source and survivor customer accounts.");
  }

  if (sourceCustomerId === survivorCustomerId) {
    throw invalidArgument("Source and survivor must be different customer accounts.");
  }

  if (jobId) {
    return {
      sourceCustomerId,
      survivorCustomerId,
      useSourceUsername,
      confirmationPhrase: confirmationPhrase || MERGE_ACCOUNTS_CONFIRMATION_PHRASE,
      previewId: previewId || "resume",
      previewChecksum: previewChecksum || "resume",
      ownerAttestedSameCustomer,
      ownerVerificationReason,
      jobId,
    };
  }

  if (confirmationPhrase !== MERGE_ACCOUNTS_CONFIRMATION_PHRASE) {
    throw invalidArgument(
      `Confirmation phrase must be exactly "${MERGE_ACCOUNTS_CONFIRMATION_PHRASE}".`,
    );
  }

  if (!previewId || !previewChecksum) {
    throw invalidArgument("A current preview is required before merging accounts.");
  }

  return {
    sourceCustomerId,
    survivorCustomerId,
    useSourceUsername,
    confirmationPhrase,
    previewId,
    previewChecksum,
    ownerAttestedSameCustomer,
    ownerVerificationReason,
  };
}

export const applyCustomerAccountMerge = onCall(
  async (request): Promise<ApplyCustomerAccountMergeResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      const caller = await loadCallerProfile(request.auth.uid);
      assertOwnerCaller(caller);

      const payload = parseApplyRequest(request.data);

      if (payload.jobId) {
        const existingJob = await getCustomerMergeJob(payload.jobId);
        if (!existingJob) {
          throw invalidArgument("Merge job not found.");
        }
        if (existingJob.status === "completed") {
          return {
            outcome: "completed",
            message: "Merge job already completed.",
            jobId: existingJob.jobId,
            sourceCustomerId: existingJob.sourceCustomerId,
            survivorCustomerId: existingJob.survivorCustomerId,
            previewChecksum: existingJob.previewChecksum,
          };
        }

        await runNextMergeJobStage(existingJob.jobId);
        const updated = await getCustomerMergeJob(existingJob.jobId);

        return {
          outcome: updated?.status === "completed" ? "completed" : "resumed",
          message:
            updated?.status === "completed"
              ? "Account merge completed."
              : "Merge job resumed.",
          jobId: existingJob.jobId,
          sourceCustomerId: existingJob.sourceCustomerId,
          survivorCustomerId: existingJob.survivorCustomerId,
          previewChecksum: existingJob.previewChecksum,
        };
      }

      const [sourceSnapshot, survivorSnapshot] = await Promise.all([
        loadCustomerEligibilitySnapshot(payload.sourceCustomerId),
        loadCustomerEligibilitySnapshot(payload.survivorCustomerId),
      ]);

      assertCustomerEligibleForIdentityMutation(sourceSnapshot, "merge");
      assertCustomerEligibleForIdentityMutation(survivorSnapshot, "merge");

      const plannedSurvivorUsername = payload.useSourceUsername
        ? (sourceSnapshot.username ?? "")
        : (survivorSnapshot.username ?? sourceSnapshot.username ?? "");

      if (!plannedSurvivorUsername) {
        throw invalidArgument("Survivor must have a planned username before merge.");
      }

      await consumeMergePreviewOnApply({
        previewId: payload.previewId,
        previewChecksum: payload.previewChecksum,
        sourceCustomerId: payload.sourceCustomerId,
        survivorCustomerId: payload.survivorCustomerId,
        useSourceUsername: payload.useSourceUsername,
        plannedSurvivorUsername,
        callerId: caller.id,
      });

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

      if (continuablePolicy.blocked) {
        return {
          outcome: "blocked",
          message:
            continuablePolicy.blockers[0]?.message ??
            "Continuable print requests block merge Apply.",
          jobId: null,
          sourceCustomerId: payload.sourceCustomerId,
          survivorCustomerId: payload.survivorCustomerId,
          previewChecksum: payload.previewChecksum,
          blockers: continuablePolicy.blockers,
        };
      }

      const currentChecksum = buildAccountMergePreviewChecksum({
        sourceSnapshot,
        survivorSnapshot,
        useSourceUsername: payload.useSourceUsername,
        plannedSurvivorUsername,
        continuablePolicy,
        sourceInventory: inventory.source,
        survivorInventory: inventory.survivor,
        storageMigration: inventory.storageMigration,
      });

      if (currentChecksum !== payload.previewChecksum) {
        throw failedPrecondition(
          "Customer state changed since preview. Run preview again before applying.",
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
          jobId: null,
          sourceCustomerId: payload.sourceCustomerId,
          survivorCustomerId: payload.survivorCustomerId,
          previewChecksum: payload.previewChecksum,
        };
      }

      const sourcePlaceholderUsername = sourceSnapshot.username
        ? buildMergeSourcePlaceholderUsername(payload.sourceCustomerId)
        : null;

      const jobId = await createCustomerMergeJob({
        sourceCustomerId: payload.sourceCustomerId,
        survivorCustomerId: payload.survivorCustomerId,
        actorUid: caller.id,
        previewId: payload.previewId,
        previewChecksum: payload.previewChecksum,
        useSourceUsername: payload.useSourceUsername,
        plannedSurvivorUsername,
        sourcePlaceholderUsername,
        continuablePolicy,
      });

      const startMetadata = withoutUndefinedFields({
        mergeJobId: jobId,
        previewChecksum: payload.previewChecksum,
        previewId: payload.previewId,
        sourceCustomerId: payload.sourceCustomerId,
        survivorCustomerId: payload.survivorCustomerId,
        useSourceUsername: payload.useSourceUsername,
        plannedSurvivorUsername,
        verificationMode: verification.mode,
      });

      await Promise.all([
        appendCustomerActivityEvent({
          customerId: payload.sourceCustomerId,
          eventType: "account.merge_started",
          actorUid: caller.id,
          actorRole: "owner",
          result: "success",
          metadata: startMetadata,
        }),
        appendCustomerActivityEvent({
          customerId: payload.survivorCustomerId,
          eventType: "account.merge_started",
          actorUid: caller.id,
          actorRole: "owner",
          result: "success",
          metadata: startMetadata,
        }),
      ]);

      try {
        await runNextMergeJobStage(jobId);
      } catch {
        // Partial progress is persisted; client can resume via jobId.
      }

      const job = await getCustomerMergeJob(jobId);

      return {
        outcome: job?.status === "completed" ? "completed" : "started",
        message:
          job?.status === "completed"
            ? "Account merge completed."
            : "Account merge started. Poll status or resume if needed.",
        jobId,
        sourceCustomerId: payload.sourceCustomerId,
        survivorCustomerId: payload.survivorCustomerId,
        previewChecksum: payload.previewChecksum,
      };
    } catch (error) {
      mapHttpsError(error);
    }
  },
);
