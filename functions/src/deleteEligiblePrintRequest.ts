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
import { adminDb } from "./lib/admin";
import { loadCallerProfile } from "./lib/caller";
import {
  isWorkingPrintRequestStatus,
  itemStatusBlocksHardDelete,
} from "./lib/deletionEligibility";
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

  const labels: string[] = [];
  for (const showId of showIds.slice(0, 8)) {
    const showSnap = await adminDb.collection("upcomingShows").doc(showId).get();
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
    labels.push(
      typeof title === "string" && title.trim()
        ? showDate
          ? `${title.trim()} (${showDate})`
          : title.trim()
        : "Assigned show",
    );
  }

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

async function buildPreview(printRequestId: string): Promise<PreviewPrintRequestDeletionResponse> {
  const snap = await adminDb.collection("printRequests").doc(printRequestId).get();
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
  const { allocationCount, blockers: allocationBlockers } =
    await loadAllocationBlockers(printRequestId);
  const { itemCount, hasProductionHistory, blockers: itemBlockers } =
    await loadItemHardDeleteBlockers(printRequestId);

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

async function deleteItemsForRequest(printRequestId: string): Promise<number> {
  let deleted = 0;
  for (;;) {
    const snapshot = await adminDb
      .collection("printRequestItems")
      .where("printRequestId", "==", printRequestId)
      .limit(BATCH_LIMIT)
      .get();
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
  async (request): Promise<PreviewPrintRequestDeletionResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    try {
      const caller = await loadCallerProfile(request.auth.uid);
      assertOwnerCaller(caller);
      return await buildPreview(parsePrintRequestId(request.data as PreviewPrintRequestDeletionRequest));
    } catch (error) {
      mapHttpsError(error);
    }
  },
);

export const deleteEligiblePrintRequest = onCall(
  async (request): Promise<DeleteEligiblePrintRequestResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    try {
      const caller = await loadCallerProfile(request.auth.uid);
      assertOwnerCaller(caller);
      const printRequestId = parsePrintRequestId(request.data);
      requirePhrase(request.data, DELETE_PRINT_REQUEST_CONFIRMATION_PHRASE);

      const preview = await buildPreview(printRequestId);
      if (preview.outcome === "already_done") {
        return {
          outcome: "already_done",
          message: "Print request already deleted.",
          entityId: printRequestId,
          printRequestId,
          deletedItemCount: 0,
        };
      }
      if (preview.outcome !== "allowed_hard_delete") {
        return {
          outcome: preview.outcome,
          blockers: preview.blockers,
          message: preview.blockers[0]?.message ?? "This print request cannot be deleted.",
          entityId: printRequestId,
          printRequestId,
          deletedItemCount: 0,
        };
      }

      // Recheck immediately before mutate
      const recheck = await buildPreview(printRequestId);
      if (recheck.outcome !== "allowed_hard_delete") {
        return {
          outcome: recheck.outcome,
          blockers: recheck.blockers,
          message: recheck.blockers[0]?.message ?? "Dependencies changed. Deletion was blocked.",
          entityId: printRequestId,
          printRequestId,
          deletedItemCount: 0,
        };
      }

      const deletedItemCount = await deleteItemsForRequest(printRequestId);
      await adminDb.collection("printRequests").doc(printRequestId).delete();

      return {
        outcome: "allowed_hard_delete",
        message: "Unused print request deleted.",
        entityId: printRequestId,
        printRequestId,
        deletedItemCount,
      };
    } catch (error) {
      mapHttpsError(error);
    }
  },
);

export const archivePrintRequest = onCall(
  async (request): Promise<ArchivePrintRequestResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    try {
      const caller = await loadCallerProfile(request.auth.uid);
      assertOwnerCaller(caller);
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
