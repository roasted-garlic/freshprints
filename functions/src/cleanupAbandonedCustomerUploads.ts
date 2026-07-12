import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import { CUSTOMER_UPLOAD_COLLECTIONS } from "../../packages/shared/src/constants/customerUpload/customerUploadCollections.constants";

import { adminDb, adminStorage } from "./lib/admin";
import { assertStaffCaller, loadCallerProfile } from "./lib/caller";
import { storageObjectPath } from "./lib/customerUploadProcessing";
import { invalidArgument, permissionDenied, unauthenticated } from "./lib/errors";

const ABANDON_AFTER_MS = 24 * 60 * 60 * 1000;
const SCAN_BATCH = 200;

export interface CleanupAbandonedCustomerUploadsRequest {
  dryRun?: boolean;
}

export interface CleanupAbandonedCustomerUploadsResponse {
  dryRun: boolean;
  cutoffIso: string;
  uploadsMarkedAbandoned: number;
  batchesMarkedAbandoned: number;
  sourceObjectsDeleted: number;
  uploadIds: string[];
  batchIds: string[];
}

function assertOwnerAdminCaller(caller: Awaited<ReturnType<typeof loadCallerProfile>>): void {
  if (!caller.isActive || !["owner", "admin"].includes(caller.role)) {
    throw permissionDenied("Only owners and admins can clean up abandoned customer uploads.");
  }
}

function parseRequest(data: unknown): CleanupAbandonedCustomerUploadsRequest {
  if (data == null) {
    return { dryRun: false };
  }
  if (typeof data !== "object") {
    throw invalidArgument("Request data must be an object.");
  }
  return {
    dryRun: "dryRun" in data && data.dryRun === true,
  };
}

function createdAtMillis(value: unknown): number | null {
  if (value instanceof Timestamp) {
    return value.toMillis();
  }
  return null;
}

async function deleteSourceIfPresent(sourceStoragePath: string | null): Promise<boolean> {
  if (!sourceStoragePath) {
    return false;
  }
  const file = adminStorage.bucket().file(storageObjectPath(sourceStoragePath));
  const [exists] = await file.exists();
  if (!exists) {
    return false;
  }
  await file.delete({ ignoreNotFound: true });
  return true;
}

/**
 * Marks stale non-finalized uploads/batches as abandoned and deletes orphan source objects.
 * Never deletes production/preview/thumbnail assets (request artwork retention).
 */
export const cleanupAbandonedCustomerUploads = onCall(
  { timeoutSeconds: 300, memory: "512MiB" },
  async (request): Promise<CleanupAbandonedCustomerUploadsResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    const caller = await loadCallerProfile(request.auth.uid);
    assertStaffCaller(caller);
    assertOwnerAdminCaller(caller);

    let parsed: CleanupAbandonedCustomerUploadsRequest;
    try {
      parsed = parseRequest(request.data);
    } catch (error) {
      throw invalidArgument(error instanceof Error ? error.message : "Invalid request.");
    }

    const dryRun = parsed.dryRun === true;
    const cutoffMs = Date.now() - ABANDON_AFTER_MS;
    const cutoffIso = new Date(cutoffMs).toISOString();

    const abandonedStatuses = new Set(["awaiting_upload", "uploading", "validating", "processing"]);
    const uploadIds: string[] = [];
    const batchIds: string[] = [];
    let sourceObjectsDeleted = 0;
    let uploadsMarkedAbandoned = 0;
    let batchesMarkedAbandoned = 0;

    let lastUploadId: string | undefined;
    for (;;) {
      let query = adminDb
        .collection(CUSTOMER_UPLOAD_COLLECTIONS.customerUploads)
        .orderBy("__name__")
        .limit(SCAN_BATCH);
      if (lastUploadId) {
        query = query.startAfter(lastUploadId);
      }
      const snapshot = await query.get();
      if (snapshot.empty) {
        break;
      }

      for (const document of snapshot.docs) {
        const data = document.data();
        const technicalStatus =
          typeof data.technicalStatus === "string" ? data.technicalStatus : "";
        if (!abandonedStatuses.has(technicalStatus)) {
          continue;
        }
        // Never touch uploads already attached to a print request.
        if (typeof data.printRequestId === "string" && data.printRequestId.trim()) {
          continue;
        }
        const createdMs = createdAtMillis(data.createdAt);
        if (createdMs == null || createdMs > cutoffMs) {
          continue;
        }

        uploadIds.push(document.id);
        const sourcePath =
          typeof data.sourceStoragePath === "string" ? data.sourceStoragePath : null;

        if (!dryRun) {
          await document.ref.update({
            technicalStatus: "failed",
            technicalFailureCode: "processing_failed",
            technicalFailureMessage: "Abandoned: upload was not finalized within 24 hours.",
            catalogReviewStatus: "not_eligible",
            updatedAt: FieldValue.serverTimestamp(),
          });
          uploadsMarkedAbandoned += 1;
          if (await deleteSourceIfPresent(sourcePath)) {
            sourceObjectsDeleted += 1;
          }
        } else {
          uploadsMarkedAbandoned += 1;
        }
      }

      lastUploadId = snapshot.docs[snapshot.docs.length - 1]?.id;
      if (snapshot.size < SCAN_BATCH) {
        break;
      }
    }

    let lastBatchId: string | undefined;
    for (;;) {
      let query = adminDb
        .collection(CUSTOMER_UPLOAD_COLLECTIONS.customerUploadBatches)
        .orderBy("__name__")
        .limit(SCAN_BATCH);
      if (lastBatchId) {
        query = query.startAfter(lastBatchId);
      }
      const snapshot = await query.get();
      if (snapshot.empty) {
        break;
      }

      for (const document of snapshot.docs) {
        const data = document.data();
        const status = typeof data.status === "string" ? data.status : "";
        if (status !== "open") {
          continue;
        }
        const createdMs = createdAtMillis(data.createdAt);
        if (createdMs == null || createdMs > cutoffMs) {
          continue;
        }

        batchIds.push(document.id);
        if (!dryRun) {
          await document.ref.update({
            status: "abandoned",
            updatedAt: FieldValue.serverTimestamp(),
          });
          batchesMarkedAbandoned += 1;
        } else {
          batchesMarkedAbandoned += 1;
        }
      }

      lastBatchId = snapshot.docs[snapshot.docs.length - 1]?.id;
      if (snapshot.size < SCAN_BATCH) {
        break;
      }
    }

    return {
      dryRun,
      cutoffIso,
      uploadsMarkedAbandoned,
      batchesMarkedAbandoned,
      sourceObjectsDeleted: dryRun ? 0 : sourceObjectsDeleted,
      uploadIds: uploadIds.slice(0, 50),
      batchIds: batchIds.slice(0, 50),
    };
  },
);
