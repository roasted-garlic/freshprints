import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import {
  isEmptyWorkingPrintRequestEligibleForAutoArchive,
  PRINT_REQUEST_WORKING_EMPTY_AUTO_ARCHIVE_AFTER_DAYS,
} from "../../packages/shared/src/utils/printRequestWorkingTriage";

import { adminDb } from "./lib/admin";
import { assertStaffCaller, loadCallerProfile } from "./lib/caller";
import { invalidArgument, permissionDenied, unauthenticated } from "./lib/errors";
// Note: applyRestoreParkedDraftInTransaction could be used for editing requests,
// but batch operations make it complex to implement safely

export interface ArchiveStaleWorkingPrintRequestsRequest {
  dryRun?: boolean;
}

export interface ArchiveStaleWorkingPrintRequestsResponse {
  dryRun: boolean;
  staleAfterDays: number;
  cutoffIso: string;
  scanned: number;
  archivedCount: number;
  printRequestIds: string[];
}

function assertOwnerAdmin(caller: Awaited<ReturnType<typeof loadCallerProfile>>): void {
  if (!caller.isActive || !["owner", "admin"].includes(caller.role)) {
    throw permissionDenied("Only owners and admins can archive stale working print requests.");
  }
}

function parseRequest(data: unknown): ArchiveStaleWorkingPrintRequestsRequest {
  if (data == null) {
    return { dryRun: false };
  }
  if (typeof data !== "object") {
    throw invalidArgument("Request data must be an object.");
  }
  return { dryRun: Boolean((data as { dryRun?: unknown }).dryRun) };
}

/**
 * Soft-archives empty working print requests older than the stale window.
 * Stale carts that still have items are left for Studio Stale filter (not auto-archived).
 */
export const archiveStaleWorkingPrintRequests = onCall(
  async (request): Promise<ArchiveStaleWorkingPrintRequestsResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    const caller = await loadCallerProfile(request.auth.uid);
    assertStaffCaller(caller);
    assertOwnerAdmin(caller);

    const payload = parseRequest(request.data);
    const nowMs = Date.now();
    const cutoffMs = nowMs - PRINT_REQUEST_WORKING_EMPTY_AUTO_ARCHIVE_AFTER_DAYS * 24 * 60 * 60 * 1000;
    const cutoff = Timestamp.fromMillis(cutoffMs);

    const draftSnap = await adminDb
      .collection("printRequests")
      .where("status", "==", "draft")
      .where("updatedAt", "<", cutoff)
      .limit(150)
      .get();
    const editingSnap = await adminDb
      .collection("printRequests")
      .where("status", "==", "editing")
      .where("updatedAt", "<", cutoff)
      .limit(150)
      .get();

    const snapshotDocs = [...draftSnap.docs, ...editingSnap.docs];

    const candidates: string[] = [];
    let scanned = 0;

    for (const docSnap of snapshotDocs) {
      scanned += 1;
      const data = docSnap.data() ?? {};
      const itemCount = typeof data.itemCount === "number" ? data.itemCount : 0;
      const updatedAt = data.updatedAt as Timestamp | undefined;
      const updatedAtMillis = updatedAt?.toMillis?.() ?? 0;

      if (
        !isEmptyWorkingPrintRequestEligibleForAutoArchive({
          itemCount,
          updatedAtMillis,
          nowMs,
        })
      ) {
        continue;
      }

      const allocationsSnap = await adminDb
        .collection("showAllocations")
        .where("printRequestId", "==", docSnap.id)
        .limit(10)
        .get();

      const hasActiveAllocation = allocationsSnap.docs.some((allocationDoc) => {
        const allocationStatus = allocationDoc.data()?.status;
        return (
          allocationStatus === "pending" ||
          allocationStatus === "queued" ||
          allocationStatus === "in_progress"
        );
      });

      if (hasActiveAllocation) {
        continue;
      }

      candidates.push(docSnap.id);
    }

    if (!payload.dryRun) {
      let batch = adminDb.batch();
      let ops = 0;
      for (const id of candidates) {
        batch.update(adminDb.collection("printRequests").doc(id), {
          status: "archived",
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: request.auth.uid,
        });
        ops += 1;
        if (ops >= 400) {
          await batch.commit();
          batch = adminDb.batch();
          ops = 0;
        }
      }
      if (ops > 0) {
        await batch.commit();
      }
    }

    return {
      dryRun: Boolean(payload.dryRun),
      staleAfterDays: PRINT_REQUEST_WORKING_EMPTY_AUTO_ARCHIVE_AFTER_DAYS,
      cutoffIso: cutoff.toDate().toISOString(),
      scanned,
      archivedCount: candidates.length,
      printRequestIds: candidates,
    };
  },
);
