import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import { CUSTOMER_UPLOAD_COLLECTIONS } from "../../packages/shared/src/constants/customerUpload/customerUploadCollections.constants";
import {
  CUSTOMER_UPLOAD_FULL_SIZE_IDLE_AFTER_DAYS,
  evaluateCustomerUploadFullSizeRetention,
  isActiveShowAllocationStatus,
  isShowProductionStatusAllowingUploadPurge,
  isWorkingPrintRequestStatus,
} from "../../packages/shared/src/utils/customerUploadFullSizeRetention";

import { adminDb, adminStorage } from "./lib/admin";
import { assertStaffCaller, loadCallerProfile } from "./lib/caller";
import { storageObjectPath } from "./lib/customerUploadProcessing";
import { invalidArgument, permissionDenied, unauthenticated } from "./lib/errors";

const SCAN_LIMIT = 100;
const PURGE_CAP = 50;

export interface PurgeIdleCustomerUploadFullSizeRequest {
  dryRun?: boolean;
}

export interface PurgeIdleCustomerUploadFullSizeItemResult {
  uploadId: string;
  reason: string;
  purged: boolean;
  storageFilesDeleted?: number;
}

export interface PurgeIdleCustomerUploadFullSizeResponse {
  dryRun: boolean;
  idleAfterDays: number;
  scanned: number;
  eligibleCount: number;
  purgedCount: number;
  results: PurgeIdleCustomerUploadFullSizeItemResult[];
}

function assertOwnerAdmin(caller: Awaited<ReturnType<typeof loadCallerProfile>>): void {
  if (!caller.isActive || !["owner", "admin"].includes(caller.role)) {
    throw permissionDenied("Only owners and admins can purge idle customer-upload full-size files.");
  }
}

function parseRequest(data: unknown): PurgeIdleCustomerUploadFullSizeRequest {
  if (data == null) {
    return { dryRun: false };
  }
  if (typeof data !== "object") {
    throw invalidArgument("Request data must be an object.");
  }
  return { dryRun: Boolean((data as { dryRun?: unknown }).dryRun) };
}

function timestampMillis(value: unknown): number | null {
  if (value instanceof Timestamp) {
    return value.toMillis();
  }
  return null;
}

async function deleteStorageIfPresent(path: string | null | undefined): Promise<boolean> {
  if (typeof path !== "string" || !path.trim()) {
    return false;
  }

  try {
    await adminStorage.bucket().file(storageObjectPath(path)).delete({ ignoreNotFound: true });
    return true;
  } catch {
    return false;
  }
}

async function loadUploadContext(uploadId: string, printRequestId: string | null) {
  const allocationsSnap = await adminDb
    .collection("showAllocations")
    .where("customerUploadId", "==", uploadId)
    .limit(50)
    .get();

  let hasActiveAllocation = false;
  const showIds = new Set<string>();

  for (const allocationDoc of allocationsSnap.docs) {
    const data = allocationDoc.data() ?? {};
    const status = typeof data.status === "string" ? data.status : "";
    if (isActiveShowAllocationStatus(status)) {
      hasActiveAllocation = true;
    }
    if (typeof data.upcomingShowId === "string" && data.upcomingShowId.trim()) {
      showIds.add(data.upcomingShowId.trim());
    }
  }

  let allLinkedShowsAllowPurge = true;
  for (const showId of showIds) {
    const showSnap = await adminDb.collection("upcomingShows").doc(showId).get();
    if (!showSnap.exists) {
      continue;
    }
    const productionStatus = showSnap.data()?.productionStatus;
    if (
      typeof productionStatus !== "string" ||
      !isShowProductionStatusAllowingUploadPurge(productionStatus)
    ) {
      allLinkedShowsAllowPurge = false;
      break;
    }
  }

  const requestIds = new Set<string>();
  if (typeof printRequestId === "string" && printRequestId.trim()) {
    requestIds.add(printRequestId.trim());
  }

  const itemsSnap = await adminDb
    .collection("printRequestItems")
    .where("customerUploadId", "==", uploadId)
    .limit(20)
    .get();
  for (const itemDoc of itemsSnap.docs) {
    const itemRequestId = itemDoc.data()?.printRequestId;
    if (typeof itemRequestId === "string" && itemRequestId.trim()) {
      requestIds.add(itemRequestId.trim());
    }
  }

  let onWorkingPrintRequest = false;
  for (const requestId of requestIds) {
    const requestSnap = await adminDb.collection("printRequests").doc(requestId).get();
    if (!requestSnap.exists) {
      continue;
    }
    const status = requestSnap.data()?.status;
    if (typeof status === "string" && isWorkingPrintRequestStatus(status)) {
      onWorkingPrintRequest = true;
      break;
    }
  }

  return {
    hasActiveAllocation,
    hasAnyAllocation: allocationsSnap.size > 0,
    allLinkedShowsAllowPurge: showIds.size === 0 ? true : allLinkedShowsAllowPurge,
    onWorkingPrintRequest,
  };
}

/**
 * Purges customer request-upload source + production after show completion or 14-day idle
 * (ADR-FP-086 §3). Keeps thumbnail and preview.
 */
export const purgeIdleCustomerUploadFullSize = onCall(
  { timeoutSeconds: 540, memory: "512MiB" },
  async (request): Promise<PurgeIdleCustomerUploadFullSizeResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    const caller = await loadCallerProfile(request.auth.uid);
    assertStaffCaller(caller);
    assertOwnerAdmin(caller);

    const payload = parseRequest(request.data);
    const nowMs = Date.now();
    const dryRun = payload.dryRun === true;

    const snapshot = await adminDb
      .collection(CUSTOMER_UPLOAD_COLLECTIONS.customerUploads)
      .where("technicalStatus", "==", "ready")
      .limit(SCAN_LIMIT)
      .get();

    const results: PurgeIdleCustomerUploadFullSizeItemResult[] = [];
    let scanned = 0;
    let purgedCount = 0;

    for (const docSnap of snapshot.docs) {
      if (purgedCount >= PURGE_CAP) {
        break;
      }

      scanned += 1;
      const data = docSnap.data() ?? {};

      if (data.fullSizePurgedAt != null) {
        results.push({ uploadId: docSnap.id, reason: "already_purged", purged: false });
        continue;
      }

      const printRequestId =
        typeof data.printRequestId === "string" ? data.printRequestId : null;
      const context = await loadUploadContext(docSnap.id, printRequestId);

      const evaluation = evaluateCustomerUploadFullSizeRetention({
        purpose: typeof data.purpose === "string" ? data.purpose : null,
        technicalStatus: typeof data.technicalStatus === "string" ? data.technicalStatus : "",
        fullSizePurgedAtMillis: timestampMillis(data.fullSizePurgedAt),
        onWorkingPrintRequest: context.onWorkingPrintRequest,
        hasActiveAllocation: context.hasActiveAllocation,
        hasAnyAllocation: context.hasAnyAllocation,
        allLinkedShowsAllowPurge: context.allLinkedShowsAllowPurge,
        updatedAtMillis: timestampMillis(data.updatedAt),
        createdAtMillis: timestampMillis(data.createdAt),
        nowMs,
      });

      if (!evaluation.eligible) {
        results.push({ uploadId: docSnap.id, reason: evaluation.reason, purged: false });
        continue;
      }

      if (dryRun) {
        results.push({ uploadId: docSnap.id, reason: evaluation.reason, purged: true });
        purgedCount += 1;
        continue;
      }

      let storageFilesDeleted = 0;
      if (await deleteStorageIfPresent(typeof data.sourceStoragePath === "string" ? data.sourceStoragePath : null)) {
        storageFilesDeleted += 1;
      }
      if (
        await deleteStorageIfPresent(
          typeof data.productionStoragePath === "string" ? data.productionStoragePath : null,
        )
      ) {
        storageFilesDeleted += 1;
      }

      await docSnap.ref.update({
        sourceStoragePath: null,
        productionStoragePath: null,
        fullSizePurgedAt: FieldValue.serverTimestamp(),
        fullSizePurgedBy: caller.id,
        updatedAt: FieldValue.serverTimestamp(),
      });

      results.push({
        uploadId: docSnap.id,
        reason: evaluation.reason,
        purged: true,
        storageFilesDeleted,
      });
      purgedCount += 1;
    }

    return {
      dryRun,
      idleAfterDays: CUSTOMER_UPLOAD_FULL_SIZE_IDLE_AFTER_DAYS,
      scanned,
      eligibleCount: results.filter((entry) => entry.purged).length,
      purgedCount,
      results,
    };
  },
);
