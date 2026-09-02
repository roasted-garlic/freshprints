import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import {
  ARCHIVE_PRINT_REQUEST_CONFIRMATION_PHRASE,
  DELETE_PRINT_REQUEST_CONFIRMATION_PHRASE,
  type ArchivePrintRequestRequest,
  type ArchivePrintRequestResponse,
  type DeleteEligiblePrintRequestResponse,
  type DeletionBlocker,
  type PreviewPrintRequestDeletionRequest,
  type PreviewPrintRequestDeletionResponse,
} from "../../packages/shared/src/types/deletion/deletion.types";
import type { DeletionCallableWarmupResponse } from "../../packages/shared/src/types/deletion/deletionWarmup.types";
import { adminDb } from "./lib/admin";
import { loadCallerProfile } from "./lib/caller";
import {
  isWorkingPrintRequestStatus,
  itemStatusBlocksHardDelete,
} from "./lib/deletionEligibility";
import { deletionWarmupOk, isDeletionCallableWarmupRequest } from "./lib/deletionWarmup";
import {
  failedPrecondition,
  invalidArgument,
  permissionDenied,
  unauthenticated,
} from "./lib/errors";

const BATCH_LIMIT = 400;

function assertOwnerCaller(caller: Awaited<ReturnType<typeof loadCallerProfile>>): void {
  if (!caller.isActive || caller.role !== "owner") {
    throw permissionDenied("Only owners can delete or archive print requests.");
  }
}

function mapHttpsError(error: unknown): never {
  if (error instanceof HttpsError) {
    throw error;
  }
  if (error instanceof Error) {
    throw invalidArgument(error.message);
  }
  throw failedPrecondition("Unable to process print request deletion right now.");
}

function parsePrintRequestId(data: unknown): string {
  if (!data || typeof data !== "object") {
    throw invalidArgument("Request data is required.");
  }
  const printRequestId =
    "printRequestId" in data && typeof data.printRequestId === "string"
      ? data.printRequestId.trim()
      : "";
  if (!printRequestId) {
    throw invalidArgument("Select a print request.");
  }
  return printRequestId;
}

function requirePhrase(data: unknown, expected: string): string {
  const phrase =
    data &&
    typeof data === "object" &&
    "confirmationPhrase" in data &&
    typeof data.confirmationPhrase === "string"
      ? data.confirmationPhrase.trim()
      : "";
  if (phrase !== expected) {
    throw invalidArgument(`Confirmation phrase must be exactly "${expected}".`);
  }
  return phrase;
}

async function loadAllocationBlockers(printRequestId: string): Promise<{
  allocationCount: number;
  blockers: DeletionBlocker[];
}> {
  const allocations = await adminDb
    .collection("showAllocations")
    .where("printRequestId", "==", printRequestId)
    .get();

  if (allocations.empty) {
    return { allocationCount: 0, blockers: [] };
  }

  const showIds = [
    ...new Set(
      allocations.docs
        .map((doc) => {
          const value = doc.data().upcomingShowId;
          return typeof value === "string" ? value : "";
        })
        .filter(Boolean),
    ),
  ];

  const labelTargets = showIds.slice(0, 8);
  const labelSnaps = await Promise.all(
    labelTargets.map((showId) => adminDb.collection("upcomingShows").doc(showId).get()),
  );
  const labels: string[] = labelSnaps.map((showSnap) => {
    const title =
      typeof showSnap.data()?.title === "string"
        ? showSnap.data()?.title
        : typeof showSnap.data()?.name === "string"
          ? showSnap.data()?.name
          : null;
    const showDate =
      typeof showSnap.data()?.showDateLabel === "string"
        ? showSnap.data()?.showDateLabel
        : typeof showSnap.data()?.dateLabel === "string"
          ? showSnap.data()?.dateLabel
          : null;
    return typeof title === "string" && title.trim()
      ? showDate
        ? `${title.trim()} (${showDate})`
        : title.trim()
      : "Assigned show";
  });

  return {
    allocationCount: allocations.size,
    blockers: [
      {
        code: "has_show_allocations",
        message:
          labels.length > 0
            ? `This print request cannot be deleted because it is assigned to ${labels.join(", ")}. Remove it from the show before deleting the request.`
            : `This print request cannot be deleted because it is assigned to ${allocations.size} show allocation(s). Remove it from the show before deleting.`,
        count: allocations.size,
        labels,
        navigateHint: "Show Queue",
      },
    ],
  };
}

async function loadItemHardDeleteBlockers(printRequestId: string): Promise<{
  itemCount: number;
  hasProductionHistory: boolean;
  blockers: DeletionBlocker[];
}> {
  const items = await adminDb
    .collection("printRequestItems")
    .where("printRequestId", "==", printRequestId)
    .get();

  let hasProductionHistory = false;
  for (const doc of items.docs) {
    if (itemStatusBlocksHardDelete(doc.data().status)) {
      hasProductionHistory = true;
      break;
    }
  }

  const blockers: DeletionBlocker[] = [];
  if (hasProductionHistory) {
    blockers.push({
      code: "has_production_history",
      message:
        "This print request has printing or printed history and cannot be permanently deleted. Archive it instead.",
      count: items.size,
    });
  }

  return { itemCount: items.size, hasProductionHistory, blockers };
}

interface PreviewReadAccounting {
  readOperations: number;
  documentsReturned: number;
}

function logDeletionAccounting(
  functionName: string,
  outcome: string,
  accounting: PreviewReadAccounting & {
    deletes?: number;
    writes?: number;
    batchSize?: number;
    durationMs: number;
  },
): void {
  if (process.env.GCLOUD_PROJECT !== "fresh-prints-dev") {
    return;
  }
  console.info("print-request-deletion-accounting", {
    functionName,
    outcome,
    readOperations: accounting.readOperations,
    documentsReturned: accounting.documentsReturned,
    writes: accounting.writes ?? 0,
    deletes: accounting.deletes ?? 0,
    batchSize: accounting.batchSize ?? 0,
    durationMs: accounting.durationMs,
  });
}

async function buildPreview(
  printRequestId: string,
  accounting?: PreviewReadAccounting,
): Promise<PreviewPrintRequestDeletionResponse> {
  const track = (reads: number, documents: number) => {
    if (accounting) {
      accounting.readOperations += reads;
      accounting.documentsReturned += documents;
    }
  };
  const snap = await adminDb.collection("printRequests").doc(printRequestId).get();
  track(1, snap.exists ? 1 : 0);
  if (!snap.exists) {
    return {
      outcome: "already_done",
      blockers: [],
      entityLabel: "Print request",
      notes: ["This print request is already gone."],
      printRequestId,
      printRequestName: "Print request",
      itemCount: 0,
      allocationCount: 0,
    };
  }

  const data = snap.data() ?? {};
  const name =
    typeof data.name === "string" && data.name.trim() ? data.name.trim() : "Print request";
  const status = data.status;
  // Independent equality queries — parallelize for warm-path latency (semantics unchanged).
  const [allocationResult, itemResult] = await Promise.all([
    loadAllocationBlockers(printRequestId),
    loadItemHardDeleteBlockers(printRequestId),
  ]);
  const { allocationCount, blockers: allocationBlockers } = allocationResult;
  const { itemCount, hasProductionHistory, blockers: itemBlockers } = itemResult;
  // One allocations query (allocationCount docs) plus one upcomingShows get per resolved label.
  track(1, allocationCount);
  const showLabelReads = allocationBlockers[0]?.labels?.length ?? 0;
  track(showLabelReads, showLabelReads);
  track(1, itemCount);

  if (allocationBlockers.length > 0) {
    return {
      outcome: "blocked",
      blockers: allocationBlockers,
      entityLabel: name,
      printRequestId,
      printRequestName: name,
      itemCount,
      allocationCount,
    };
  }

  if (hasProductionHistory || status === "completed" || status === "archived") {
    return {
      outcome: "archive",
      blockers: itemBlockers,
      entityLabel: name,
      confirmLabel: "Archive request",
      notes: ["Historical requests are archived, not permanently deleted."],
      printRequestId,
      printRequestName: name,
      itemCount,
      allocationCount,
    };
  }

  if (!isWorkingPrintRequestStatus(status)) {
    return {
      outcome: "blocked",
      blockers: [
        {
          code: "invalid_status",
          message: "This print request cannot be deleted in its current status.",
        },
      ],
      entityLabel: name,
      printRequestId,
      printRequestName: name,
      itemCount,
      allocationCount,
    };
  }

  return {
    outcome: "allowed_hard_delete",
    blockers: [],
    entityLabel: name,
    confirmLabel: "Delete unused request",
    notes: [`This will permanently delete the request and its ${itemCount} line item(s).`],
    printRequestId,
    printRequestName: name,
    itemCount,
    allocationCount,
  };
}

async function deleteItemsForRequest(
  printRequestId: string,
  accounting?: PreviewReadAccounting,
): Promise<number> {
  let deleted = 0;
  for (;;) {
    const snapshot = await adminDb
      .collection("printRequestItems")
      .where("printRequestId", "==", printRequestId)
      .limit(BATCH_LIMIT)
      .get();
    if (accounting) {
      accounting.readOperations += 1;
      accounting.documentsReturned += snapshot.size;
    }
    if (snapshot.empty) {
      break;
    }
    const batch = adminDb.batch();
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();
    deleted += snapshot.size;
    if (snapshot.size < BATCH_LIMIT) {
      break;
    }
  }
  return deleted;
}

export const previewPrintRequestDeletion = onCall(
  async (
    request,
  ): Promise<PreviewPrintRequestDeletionResponse | DeletionCallableWarmupResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    const startedAtMs = Date.now();
    // Caller-profile read is the first tracked operation.
    const accounting: PreviewReadAccounting = { readOperations: 1, documentsReturned: 1 };
    try {
      const caller = await loadCallerProfile(request.auth.uid);
      assertOwnerCaller(caller);
      if (isDeletionCallableWarmupRequest(request.data)) {
        return deletionWarmupOk();
      }
      const preview = await buildPreview(
        parsePrintRequestId(request.data as PreviewPrintRequestDeletionRequest),
        accounting,
      );
      logDeletionAccounting("previewPrintRequestDeletion", preview.outcome, {
        ...accounting,
        durationMs: Date.now() - startedAtMs,
      });
      return preview;
    } catch (error) {
      logDeletionAccounting("previewPrintRequestDeletion", "error", {
        ...accounting,
        durationMs: Date.now() - startedAtMs,
      });
      mapHttpsError(error);
    }
  },
);

export const deleteEligiblePrintRequest = onCall(
  async (
    request,
  ): Promise<DeleteEligiblePrintRequestResponse | DeletionCallableWarmupResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    const startedAtMs = Date.now();
    const accounting: PreviewReadAccounting = { readOperations: 1, documentsReturned: 1 };
    let deletes = 0;
    try {
      const caller = await loadCallerProfile(request.auth.uid);
      assertOwnerCaller(caller);
      if (isDeletionCallableWarmupRequest(request.data)) {
        return deletionWarmupOk();
      }
      const printRequestId = parsePrintRequestId(request.data);
      requirePhrase(request.data, DELETE_PRINT_REQUEST_CONFIRMATION_PHRASE);

      // Single freshness check immediately before mutate. The client already fetched a preview via
      // `previewPrintRequestDeletion` to render the confirmation dialog moments earlier; rechecking
      // here (not also before this recheck) preserves the TOCTOU-safety intent — dependencies could
      // have changed between dialog-open and confirm — while dropping the redundant third
      // `buildPreview()` execution this callable previously ran (Wave C comprehensive-audit
      // amendment, 2026-07-24: reads dropped from 3x to 2x base preview cost for this flow).
      const recheck = await buildPreview(printRequestId, accounting);
      if (recheck.outcome === "already_done") {
        logDeletionAccounting("deleteEligiblePrintRequest", "already_done", {
          ...accounting,
          durationMs: Date.now() - startedAtMs,
        });
        return {
          outcome: "already_done",
          message: "Print request already deleted.",
          entityId: printRequestId,
          printRequestId,
          deletedItemCount: 0,
        };
      }
      if (recheck.outcome !== "allowed_hard_delete") {
        logDeletionAccounting("deleteEligiblePrintRequest", recheck.outcome, {
          ...accounting,
          durationMs: Date.now() - startedAtMs,
        });
        return {
          outcome: recheck.outcome,
          blockers: recheck.blockers,
          message: recheck.blockers[0]?.message ?? "Dependencies changed. Deletion was blocked.",
          entityId: printRequestId,
          printRequestId,
          deletedItemCount: 0,
        };
      }

      const deletedItemCount = await deleteItemsForRequest(printRequestId, accounting);
      await adminDb.collection("printRequests").doc(printRequestId).delete();
      deletes = deletedItemCount + 1;

      logDeletionAccounting("deleteEligiblePrintRequest", "allowed_hard_delete", {
        ...accounting,
        deletes,
        batchSize: deletedItemCount,
        durationMs: Date.now() - startedAtMs,
      });
      return {
        outcome: "allowed_hard_delete",
        message: "Unused print request deleted.",
        entityId: printRequestId,
        printRequestId,
        deletedItemCount,
      };
    } catch (error) {
      logDeletionAccounting("deleteEligiblePrintRequest", "error", {
        ...accounting,
        deletes,
        durationMs: Date.now() - startedAtMs,
      });
      mapHttpsError(error);
    }
  },
);

export const archivePrintRequest = onCall(
  async (request): Promise<ArchivePrintRequestResponse | DeletionCallableWarmupResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    try {
      const caller = await loadCallerProfile(request.auth.uid);
      assertOwnerCaller(caller);
      if (isDeletionCallableWarmupRequest(request.data)) {
        return deletionWarmupOk();
      }
      const printRequestId = parsePrintRequestId(request.data as ArchivePrintRequestRequest);
      requirePhrase(request.data, ARCHIVE_PRINT_REQUEST_CONFIRMATION_PHRASE);

      const ref = adminDb.collection("printRequests").doc(printRequestId);
      const snap = await ref.get();
      if (!snap.exists) {
        return {
          outcome: "already_done",
          message: "Print request not found.",
          entityId: printRequestId,
          printRequestId,
        };
      }

      const { allocationCount, blockers } = await loadAllocationBlockers(printRequestId);
      if (allocationCount > 0) {
        return {
          outcome: "blocked",
          blockers,
          message: blockers[0]?.message ?? "Remove show allocations before archiving.",
          entityId: printRequestId,
          printRequestId,
        };
      }

      if (snap.data()?.status === "archived") {
        return {
          outcome: "already_done",
          message: "Print request is already archived.",
          entityId: printRequestId,
          printRequestId,
        };
      }

      await ref.set(
        {
          status: "archived",
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: request.auth.uid,
        },
        { merge: true },
      );

      return {
        outcome: "archive",
        message: "Print request archived.",
        entityId: printRequestId,
        printRequestId,
      };
    } catch (error) {
      mapHttpsError(error);
    }
  },
);
