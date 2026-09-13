import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { randomUUID } from "node:crypto";

import {
  CUSTOMER_ACCOUNT_MERGE_STAGES,
  CUSTOMER_MERGE_JOBS_COLLECTION,
} from "../../../packages/shared/src/constants/customerAccountMerge.constants";
import type {
  CustomerAccountMergeJobDocument,
  CustomerAccountMergeJobStageProgress,
  CustomerAccountMergeJobStatus,
  CustomerAccountMergeStage,
  MergeContinuablePolicySummary,
} from "../../../packages/shared/src/types/customer/customerAccountMerge.types";
import { applyCustomerAccountDisableInternal } from "./applyCustomerAccountDisableInternal";
import { adminDb } from "./admin";
import { appendCustomerActivityEvent } from "./customerActivityEvents";
import {
  clearCustomerIdentityOperationLock,
  setCustomerIdentityOperationLock,
} from "./customerIdentityOperationLock";
import { consumeCustomerIdentityPreview } from "./customerIdentityOperationPreview";
import { loadCustomerEligibilitySnapshot } from "./customerIdentityEligibilitySnapshot";
import { assertCustomerEligibleForIdentityMutation } from "./customerAccountEligibility";
import { collectMergeInventoryCounts } from "./customerAccountMergeInventory";
import {
  buildAccountMergePreviewChecksum,
} from "./customerAccountMergePreview";
import {
  evaluateMergeContinuablePolicy,
  loadContinuablePortalPrintRequestsWithItemCounts,
} from "./customerMergeContinuablePrintRequests";
import { removeEmptyContinuablePrintRequestInternal } from "./customerMergeEmptyPrintRequest";
import {
  applyMergeSourcePlaceholderOnlyTransaction,
  applyMergeUsernameTransferTransaction,
} from "./customerMergeUsername";
import {
  finalizeSurvivorMergeMetadata,
  invalidateSourceWebPushSubscriptions,
  MISC_COLLECTIONS,
  moveFavoritesDedupe,
  reassignAssistedCreationBatch,
  reassignCustomerUploadBatchesMetadataBatch,
  reassignCustomerUploadsMetadataBatch,
  reassignMiscCollectionsBatch,
  reassignPrintRequestsBatch,
  reassignShowAllocationsBatch,
  reassignSpecificPrintRequests,
  tombstoneSourceCustomer,
  tombstoneSourceUser,
} from "./customerAccountMergeReassignment";
import {
  migrateAssistedCreationStoragePrefix,
  migrateCustomerUploadStoragePrefix,
} from "./customerAccountMergeStorageMigration";
import {
  initializeIdentitySnapshotPropagation,
  propagateCustomerIdentitySnapshots,
} from "./propagateCustomerIdentitySnapshots";
import { failedPrecondition } from "./errors";

function stageIndex(stage: CustomerAccountMergeStage): number {
  return CUSTOMER_ACCOUNT_MERGE_STAGES.indexOf(stage);
}

function nextStage(stage: CustomerAccountMergeStage): CustomerAccountMergeStage | null {
  const index = stageIndex(stage);
  return index >= 0 && index < CUSTOMER_ACCOUNT_MERGE_STAGES.length - 1
    ? CUSTOMER_ACCOUNT_MERGE_STAGES[index + 1]!
    : null;
}

function initialStageProgress(): CustomerAccountMergeJobStageProgress[] {
  return CUSTOMER_ACCOUNT_MERGE_STAGES.map((stage) => ({
    stage,
    status: "pending",
  }));
}

function mapJobDocument(
  jobId: string,
  data: FirebaseFirestore.DocumentData,
): CustomerAccountMergeJobDocument {
  return {
    jobId,
    sourceCustomerId: String(data.sourceCustomerId ?? ""),
    survivorCustomerId: String(data.survivorCustomerId ?? ""),
    status: (data.status as CustomerAccountMergeJobStatus) ?? "pending",
    stage: (data.stage as CustomerAccountMergeStage) ?? "validate_preview",
    createdAtMillis:
      data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now(),
    startedAtMillis:
      data.startedAt instanceof Timestamp ? data.startedAt.toMillis() : undefined,
    completedAtMillis:
      data.completedAt instanceof Timestamp ? data.completedAt.toMillis() : undefined,
    actorUid: String(data.actorUid ?? ""),
    previewId: String(data.previewId ?? ""),
    previewChecksum: String(data.previewChecksum ?? ""),
    useSourceUsername: data.useSourceUsername === true,
    plannedSurvivorUsername: String(data.plannedSurvivorUsername ?? ""),
    sourcePlaceholderUsername:
      typeof data.sourcePlaceholderUsername === "string"
        ? data.sourcePlaceholderUsername
        : undefined,
    stageProgress: Array.isArray(data.stageProgress)
      ? (data.stageProgress as CustomerAccountMergeJobStageProgress[])
      : initialStageProgress(),
    lastError: typeof data.lastError === "string" ? data.lastError : undefined,
    retryCount: typeof data.retryCount === "number" ? data.retryCount : 0,
    cursors:
      data.cursors && typeof data.cursors === "object"
        ? (data.cursors as Record<string, string | null>)
        : undefined,
  };
}

export async function createCustomerMergeJob(input: {
  sourceCustomerId: string;
  survivorCustomerId: string;
  actorUid: string;
  previewId: string;
  previewChecksum: string;
  useSourceUsername: boolean;
  plannedSurvivorUsername: string;
  sourcePlaceholderUsername: string | null;
  continuablePolicy: MergeContinuablePolicySummary;
}): Promise<string> {
  const jobId = randomUUID();
  const now = FieldValue.serverTimestamp();

  await adminDb
    .collection(CUSTOMER_MERGE_JOBS_COLLECTION)
    .doc(jobId)
    .set({
      jobId,
      sourceCustomerId: input.sourceCustomerId,
      survivorCustomerId: input.survivorCustomerId,
      status: "pending",
      stage: "validate_preview",
      createdAt: now,
      actorUid: input.actorUid,
      previewId: input.previewId,
      previewChecksum: input.previewChecksum,
      useSourceUsername: input.useSourceUsername,
      plannedSurvivorUsername: input.plannedSurvivorUsername,
      sourcePlaceholderUsername: input.sourcePlaceholderUsername,
      continuablePolicy: input.continuablePolicy,
      stageProgress: initialStageProgress(),
      retryCount: 0,
      cursors: {},
    });

  return jobId;
}

export async function getCustomerMergeJob(
  jobId: string,
): Promise<CustomerAccountMergeJobDocument | null> {
  const snap = await adminDb.collection(CUSTOMER_MERGE_JOBS_COLLECTION).doc(jobId).get();
  if (!snap.exists) {
    return null;
  }
  return mapJobDocument(jobId, snap.data() ?? {});
}

export async function advanceMergeJobStage(
  jobId: string,
  input: {
    stage: CustomerAccountMergeStage;
    status: CustomerAccountMergeJobStageProgress["status"];
    error?: string;
    nextStage?: CustomerAccountMergeStage;
    jobStatus?: CustomerAccountMergeJobStatus;
    cursors?: Record<string, string | null>;
  },
): Promise<void> {
  const ref = adminDb.collection(CUSTOMER_MERGE_JOBS_COLLECTION).doc(jobId);
  const snap = await ref.get();
  const data = snap.data() ?? {};
  const stageProgress = Array.isArray(data.stageProgress)
    ? [...(data.stageProgress as CustomerAccountMergeJobStageProgress[])]
    : initialStageProgress();

  const index = stageProgress.findIndex((entry) => entry.stage === input.stage);
  if (index >= 0) {
    stageProgress[index] = {
      ...stageProgress[index]!,
      status: input.status,
      ...(input.status === "in_progress" ? { startedAtMillis: Date.now() } : {}),
      ...(input.status === "completed" || input.status === "failed" || input.status === "skipped"
        ? { completedAtMillis: Date.now() }
        : {}),
      ...(input.error ? { error: input.error } : {}),
    };
  }

  await ref.set(
    {
      stage: input.nextStage ?? data.stage,
      status: input.jobStatus ?? data.status,
      stageProgress,
      ...(input.error ? { lastError: input.error } : {}),
      ...(input.cursors ? { cursors: input.cursors } : {}),
      ...(input.jobStatus === "completed" ? { completedAt: FieldValue.serverTimestamp() } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

async function validatePreviewForJob(job: CustomerAccountMergeJobDocument): Promise<void> {
  const [sourceSnapshot, survivorSnapshot] = await Promise.all([
    loadCustomerEligibilitySnapshot(job.sourceCustomerId),
    loadCustomerEligibilitySnapshot(job.survivorCustomerId),
  ]);

  assertCustomerEligibleForIdentityMutation(sourceSnapshot, "merge");
  assertCustomerEligibleForIdentityMutation(survivorSnapshot, "merge");

  const [sourceContinuable, survivorContinuable, inventory] = await Promise.all([
    loadContinuablePortalPrintRequestsWithItemCounts(job.sourceCustomerId),
    loadContinuablePortalPrintRequestsWithItemCounts(job.survivorCustomerId),
    collectMergeInventoryCounts({
      sourceCustomerId: job.sourceCustomerId,
      survivorCustomerId: job.survivorCustomerId,
      sourceAuthUid: sourceSnapshot.authUid,
      survivorAuthUid: survivorSnapshot.authUid,
    }),
  ]);

  const continuablePolicy = evaluateMergeContinuablePolicy({
    source: sourceContinuable,
    survivor: survivorContinuable,
  });

  if (continuablePolicy.blocked) {
    throw failedPrecondition(
      continuablePolicy.blockers[0]?.message ?? "Continuable print requests block merge.",
    );
  }

  const checksum = buildAccountMergePreviewChecksum({
    sourceSnapshot,
    survivorSnapshot,
    useSourceUsername: job.useSourceUsername,
    plannedSurvivorUsername: job.plannedSurvivorUsername,
    continuablePolicy,
    sourceInventory: inventory.source,
    survivorInventory: inventory.survivor,
    storageMigration: inventory.storageMigration,
  });

  if (checksum !== job.previewChecksum) {
    throw failedPrecondition("Customer state changed since preview. Run preview again.");
  }
}

async function releaseMergeJobLocksIfHeld(job: CustomerAccountMergeJobDocument): Promise<void> {
  const acquireStage = job.stageProgress.find((entry) => entry.stage === "acquire_locks");
  if (acquireStage?.status !== "completed") {
    return;
  }

  await Promise.all([
    clearCustomerIdentityOperationLock(job.sourceCustomerId),
    clearCustomerIdentityOperationLock(job.survivorCustomerId),
  ]);
}

export async function runNextMergeJobStage(jobId: string): Promise<CustomerAccountMergeJobDocument> {
  const job = await getCustomerMergeJob(jobId);
  if (!job) {
    throw new Error("Merge job not found.");
  }

  if (job.status === "completed") {
    return job;
  }

  const ref = adminDb.collection(CUSTOMER_MERGE_JOBS_COLLECTION).doc(jobId);
  await ref.set(
    {
      status: "in_progress",
      startedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const [sourceSnapshot, survivorSnapshot] = await Promise.all([
    loadCustomerEligibilitySnapshot(job.sourceCustomerId),
    loadCustomerEligibilitySnapshot(job.survivorCustomerId),
  ]);

  const cursors = job.cursors ?? {};
  const stage = job.stage;

  try {
    await advanceMergeJobStage(jobId, { stage, status: "in_progress" });

    switch (stage) {
      case "acquire_locks": {
        await Promise.all([
          setCustomerIdentityOperationLock(job.sourceCustomerId, {
            kind: "merge",
            lockedBy: job.actorUid,
            previewChecksum: job.previewChecksum,
          }),
          setCustomerIdentityOperationLock(job.survivorCustomerId, {
            kind: "merge",
            lockedBy: job.actorUid,
            previewChecksum: job.previewChecksum,
          }),
        ]);
        break;
      }
      case "validate_preview": {
        await validatePreviewForJob(job);
        break;
      }
      case "username_reservation": {
        if (job.useSourceUsername) {
          const result = await applyMergeUsernameTransferTransaction({
            sourceCustomerId: job.sourceCustomerId,
            survivorCustomerId: job.survivorCustomerId,
            desiredUsername: job.plannedSurvivorUsername,
            callerId: job.actorUid,
          });
          await ref.set(
            { sourcePlaceholderUsername: result.sourcePlaceholderUsername },
            { merge: true },
          );
        } else if (sourceSnapshot.username) {
          const result = await applyMergeSourcePlaceholderOnlyTransaction({
            sourceCustomerId: job.sourceCustomerId,
            callerId: job.actorUid,
          });
          await ref.set(
            { sourcePlaceholderUsername: result.sourcePlaceholderUsername },
            { merge: true },
          );
        }
        break;
      }
      case "cleanup_empty_print_requests": {
        const [sourceContinuable, survivorContinuable] = await Promise.all([
          loadContinuablePortalPrintRequestsWithItemCounts(job.sourceCustomerId),
          loadContinuablePortalPrintRequestsWithItemCounts(job.survivorCustomerId),
        ]);
        const policy = evaluateMergeContinuablePolicy({
          source: sourceContinuable,
          survivor: survivorContinuable,
        });

        for (const printRequestId of policy.emptyPrintRequestIdsToRemove) {
          const ownerId = sourceContinuable.some((request) => request.id === printRequestId)
            ? job.sourceCustomerId
            : job.survivorCustomerId;
          await removeEmptyContinuablePrintRequestInternal({
            printRequestId,
            expectedCustomerId: ownerId,
            expectedItemCount: 0,
          });
        }

        if (policy.sourceMeaningfulPrintRequestIdsToReassign.length > 0) {
          await reassignSpecificPrintRequests({
            printRequestIds: policy.sourceMeaningfulPrintRequestIdsToReassign,
            sourceCustomerId: job.sourceCustomerId,
            survivorCustomerId: job.survivorCustomerId,
          });
        }
        break;
      }
      case "reassign_print_requests": {
        const result = await reassignPrintRequestsBatch({
          sourceCustomerId: job.sourceCustomerId,
          survivorCustomerId: job.survivorCustomerId,
          cursor: cursors.printRequests ?? null,
        });
        cursors.printRequests = result.complete ? null : result.nextCursor;
        if (!result.complete) {
          await advanceMergeJobStage(jobId, {
            stage,
            status: "in_progress",
            cursors: { ...cursors },
          });
          return (await getCustomerMergeJob(jobId))!;
        }
        break;
      }
      case "reassign_show_allocations": {
        const result = await reassignShowAllocationsBatch({
          sourceCustomerId: job.sourceCustomerId,
          survivorCustomerId: job.survivorCustomerId,
          cursor: cursors.showAllocations ?? null,
        });
        cursors.showAllocations = result.complete ? null : result.nextCursor;
        if (!result.complete) {
          await advanceMergeJobStage(jobId, {
            stage,
            status: "in_progress",
            cursors: { ...cursors },
          });
          return (await getCustomerMergeJob(jobId))!;
        }
        break;
      }
      case "reassign_uploads_metadata": {
        for (const key of ["customerUploads", "customerUploadBatches"] as const) {
          const cursorKey = key;
          const batchFn =
            key === "customerUploads"
              ? reassignCustomerUploadsMetadataBatch
              : reassignCustomerUploadBatchesMetadataBatch;
          const result = await batchFn({
            sourceCustomerId: job.sourceCustomerId,
            survivorCustomerId: job.survivorCustomerId,
            survivorAuthUid: survivorSnapshot.authUid,
            cursor: cursors[cursorKey] ?? null,
          });
          if (!result.complete) {
            cursors[cursorKey] = result.nextCursor;
            await advanceMergeJobStage(jobId, {
              stage,
              status: "in_progress",
              cursors: { ...cursors },
            });
            return (await getCustomerMergeJob(jobId))!;
          }
          cursors[cursorKey] = null;
        }
        break;
      }
      case "migrate_upload_storage": {
        if (sourceSnapshot.authUid && survivorSnapshot.authUid && sourceSnapshot.authUid !== survivorSnapshot.authUid) {
          const result = await migrateCustomerUploadStoragePrefix({
            sourceAuthUid: sourceSnapshot.authUid,
            survivorAuthUid: survivorSnapshot.authUid,
            cursor: cursors.customerUploadStorage ?? null,
          });
          if (!result.complete) {
            cursors.customerUploadStorage = result.nextCursor;
            await advanceMergeJobStage(jobId, {
              stage,
              status: "in_progress",
              cursors: { ...cursors },
            });
            return (await getCustomerMergeJob(jobId))!;
          }
          cursors.customerUploadStorage = null;
        }
        break;
      }
      case "reassign_assisted_creation": {
        const result = await reassignAssistedCreationBatch({
          sourceCustomerId: job.sourceCustomerId,
          survivorCustomerId: job.survivorCustomerId,
          survivorAuthUid: survivorSnapshot.authUid,
          cursor: cursors.assistedCreationRequests ?? null,
        });
        cursors.assistedCreationRequests = result.complete ? null : result.nextCursor;
        if (!result.complete) {
          await advanceMergeJobStage(jobId, {
            stage,
            status: "in_progress",
            cursors: { ...cursors },
          });
          return (await getCustomerMergeJob(jobId))!;
        }
        break;
      }
      case "migrate_assisted_storage": {
        if (sourceSnapshot.authUid && survivorSnapshot.authUid && sourceSnapshot.authUid !== survivorSnapshot.authUid) {
          const result = await migrateAssistedCreationStoragePrefix({
            sourceAuthUid: sourceSnapshot.authUid,
            survivorAuthUid: survivorSnapshot.authUid,
            cursor: cursors.assistedCreationStorage ?? null,
          });
          if (!result.complete) {
            cursors.assistedCreationStorage = result.nextCursor;
            await advanceMergeJobStage(jobId, {
              stage,
              status: "in_progress",
              cursors: { ...cursors },
            });
            return (await getCustomerMergeJob(jobId))!;
          }
          cursors.assistedCreationStorage = null;
        }
        break;
      }
      case "reassign_misc_collections": {
        for (const collectionName of MISC_COLLECTIONS) {
          const cursorKey = `misc_${collectionName}`;
          const result = await reassignMiscCollectionsBatch({
            sourceCustomerId: job.sourceCustomerId,
            survivorCustomerId: job.survivorCustomerId,
            survivorAuthUid: survivorSnapshot.authUid,
            collectionName,
            cursor: cursors[cursorKey] ?? null,
          });
          if (!result.complete) {
            cursors[cursorKey] = result.nextCursor;
            await advanceMergeJobStage(jobId, {
              stage,
              status: "in_progress",
              cursors: { ...cursors },
            });
            return (await getCustomerMergeJob(jobId))!;
          }
          cursors[cursorKey] = null;
        }
        break;
      }
      case "move_favorites": {
        await moveFavoritesDedupe({
          sourceCustomerId: job.sourceCustomerId,
          survivorCustomerId: job.survivorCustomerId,
        });
        break;
      }
      case "invalidate_web_push": {
        await invalidateSourceWebPushSubscriptions(job.sourceCustomerId);
        break;
      }
      case "finalize_survivor_counters": {
        await finalizeSurvivorMergeMetadata({
          sourceCustomerId: job.sourceCustomerId,
          survivorCustomerId: job.survivorCustomerId,
        });
        break;
      }
      case "tombstone_source_customer": {
        await tombstoneSourceCustomer({
          sourceCustomerId: job.sourceCustomerId,
          survivorCustomerId: job.survivorCustomerId,
          callerId: job.actorUid,
          mergeJobId: jobId,
        });
        break;
      }
      case "tombstone_source_user": {
        if (sourceSnapshot.authUid) {
          await tombstoneSourceUser({
            sourceAuthUid: sourceSnapshot.authUid,
            survivorCustomerId: job.survivorCustomerId,
            callerId: job.actorUid,
          });
        }
        break;
      }
      case "disable_source_auth": {
        if (!sourceSnapshot.isDisabled) {
          await applyCustomerAccountDisableInternal({
            customerId: job.sourceCustomerId,
            callerId: job.actorUid,
            reason: "Account merged into survivor — source Auth disabled permanently.",
          });
        }
        break;
      }
      case "propagate_identity_snapshots": {
        await initializeIdentitySnapshotPropagation(job.survivorCustomerId, {
          username: job.plannedSurvivorUsername,
          displayName: survivorSnapshot.displayName,
        });
        await propagateCustomerIdentitySnapshots(job.survivorCustomerId);
        break;
      }
      case "release_locks": {
        await Promise.all([
          clearCustomerIdentityOperationLock(job.sourceCustomerId),
          clearCustomerIdentityOperationLock(job.survivorCustomerId),
        ]);
        break;
      }
      default:
        break;
    }

    const following = nextStage(stage);
    if (following) {
      await advanceMergeJobStage(jobId, {
        stage,
        status: "completed",
        nextStage: following,
        cursors: { ...cursors },
      });
      return runNextMergeJobStage(jobId);
    }

    await advanceMergeJobStage(jobId, {
      stage,
      status: "completed",
      jobStatus: "completed",
      cursors: { ...cursors },
    });

    await appendCustomerActivityEvent({
      customerId: job.survivorCustomerId,
      eventType: "account.merge_completed",
      actorUid: job.actorUid,
      actorRole: "owner",
      result: "success",
      metadata: {
        mergeJobId: jobId,
        sourceCustomerId: job.sourceCustomerId,
        survivorCustomerId: job.survivorCustomerId,
        previewChecksum: job.previewChecksum,
      },
    });

    return (await getCustomerMergeJob(jobId))!;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Merge stage failed.";
    await advanceMergeJobStage(jobId, {
      stage,
      status: "failed",
      jobStatus: "failed",
      error: message,
    });

    const failedJob = await getCustomerMergeJob(jobId);
    if (failedJob) {
      try {
        await releaseMergeJobLocksIfHeld(failedJob);
      } catch {
        // Best-effort lock cleanup; original failure is still surfaced.
      }
    }

    await appendCustomerActivityEvent({
      customerId: job.sourceCustomerId,
      eventType: "account.merge_failed",
      actorUid: job.actorUid,
      actorRole: "owner",
      result: "failed",
      metadata: {
        mergeJobId: jobId,
        sourceCustomerId: job.sourceCustomerId,
        survivorCustomerId: job.survivorCustomerId,
        failedStage: stage,
        error: message,
      },
    });

    throw error;
  }
}

export async function consumeMergePreviewOnApply(input: {
  previewId: string;
  previewChecksum: string;
  sourceCustomerId: string;
  survivorCustomerId: string;
  useSourceUsername: boolean;
  plannedSurvivorUsername: string;
  callerId: string;
}): Promise<void> {
  await consumeCustomerIdentityPreview({
    previewId: input.previewId,
    sourceCustomerId: input.sourceCustomerId,
    survivorCustomerId: input.survivorCustomerId,
    useSourceUsername: input.useSourceUsername,
    plannedSurvivorUsername: input.plannedSurvivorUsername,
    previewChecksum: input.previewChecksum,
    callerId: input.callerId,
    operation: "account_merge",
  });
}
