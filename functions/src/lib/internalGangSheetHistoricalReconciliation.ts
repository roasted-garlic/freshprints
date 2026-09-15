import { createHash } from "node:crypto";

import { evaluatePrintRequestCompletionEligibility } from "../../../packages/shared/src/utils/printRequestCompletionEligibility";
import { computePrintRequestQueueTab } from "../../../packages/shared/src/utils/printRequestQueueTabRecompute";
import { isFinishableShowAllocationStatus } from "../../../packages/shared/src/utils/showFinishAllocationStatuses";
import type {
  ApplyInternalGangSheetHistoricalReconciliationResponse,
  InternalGangSheetHistoricalReconciliationRequestEffect,
  PreviewInternalGangSheetHistoricalReconciliationResponse,
} from "../../../packages/shared/src/types/staffGangSheet/internalGangSheetHistoricalReconciliation.types";

import { adminDb } from "./admin";
import {
  finishShowAllocationsInTransaction,
  reconcilePrintRequestsAfterShowFinish,
} from "./staffGangSheetShowFinishReconciliation";

type AllocationRow = {
  id: string;
  printRequestId: string;
  status: string;
  allocatedQuantity: number;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function classifyAllocationBucket(status: string): "finishable" | "done" | "canceled" | "skipped" {
  if (status === "canceled") {
    return "canceled";
  }
  if (status === "done" || status === "printed") {
    return "done";
  }
  if (isFinishableShowAllocationStatus(status as never)) {
    return "finishable";
  }
  return "skipped";
}

function buildChecksum(payload: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 32);
}

export async function buildInternalGangSheetHistoricalReconciliationPreview(
  upcomingShowId: string,
): Promise<PreviewInternalGangSheetHistoricalReconciliationResponse> {
  const showSnap = await adminDb.collection("upcomingShows").doc(upcomingShowId).get();
  if (!showSnap.exists) {
    return {
      upcomingShowId,
      sheetTitle: "",
      cycleNumber: null,
      productionStatus: "",
      canApply: false,
      blockers: ["Internal Gang Sheet not found."],
      finishableAllocationCount: 0,
      alreadyDoneAllocationCount: 0,
      canceledAllocationCount: 0,
      skippedAllocationCount: 0,
      affectedPrintRequestCount: 0,
      wouldBecomePrintedCount: 0,
      remainQueuedCount: 0,
      alreadyTerminalCount: 0,
      requestEffects: [],
      previewChecksum: "",
      notes: [],
    };
  }

  const showData = showSnap.data() ?? {};
  const source = asString(showData.source);
  const productionStatus = asString(showData.productionStatus);
  const sheetTitle = asString(showData.title) || "Internal Gang Sheet";
  const cycleNumber =
    typeof showData.staffGangSheetCycleNumber === "number" &&
    Number.isInteger(showData.staffGangSheetCycleNumber)
      ? showData.staffGangSheetCycleNumber
      : null;

  const blockers: string[] = [];
  if (source !== "staff_gang_sheet") {
    blockers.push("Only Internal Gang Sheets can be reconciled with this action.");
  }
  if (productionStatus !== "completed") {
    blockers.push("Only completed Internal Gang Sheets in History can be reconciled.");
  }

  const allocationsSnap = await adminDb
    .collection("showAllocations")
    .where("upcomingShowId", "==", upcomingShowId)
    .get();

  const allocations: AllocationRow[] = allocationsSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      printRequestId: asString(data.printRequestId),
      status: asString(data.status) || "canceled",
      allocatedQuantity: asNumber(data.allocatedQuantity),
    };
  });

  let finishableAllocationCount = 0;
  let alreadyDoneAllocationCount = 0;
  let canceledAllocationCount = 0;
  let skippedAllocationCount = 0;
  const finishableByRequest = new Map<string, number>();

  for (const allocation of allocations) {
    const bucket = classifyAllocationBucket(allocation.status);
    if (bucket === "finishable") {
      finishableAllocationCount += 1;
      if (allocation.printRequestId) {
        finishableByRequest.set(
          allocation.printRequestId,
          (finishableByRequest.get(allocation.printRequestId) ?? 0) + 1,
        );
      }
    } else if (bucket === "done") {
      alreadyDoneAllocationCount += 1;
    } else if (bucket === "canceled") {
      canceledAllocationCount += 1;
    } else {
      skippedAllocationCount += 1;
    }
  }

  if (finishableAllocationCount === 0 && blockers.length === 0) {
    blockers.push("No finishable allocations remain on this completed sheet.");
  }

  const requestEffects: InternalGangSheetHistoricalReconciliationRequestEffect[] = [];
  let wouldBecomePrintedCount = 0;
  let remainQueuedCount = 0;
  let alreadyTerminalCount = 0;

  for (const [printRequestId, finishableCount] of [...finishableByRequest.entries()].sort(
    (a, b) => a[0].localeCompare(b[0]),
  )) {
    const [requestSnap, itemsSnap, allAllocationsSnap] = await Promise.all([
      adminDb.collection("printRequests").doc(printRequestId).get(),
      adminDb.collection("printRequestItems").where("printRequestId", "==", printRequestId).get(),
      adminDb.collection("showAllocations").where("printRequestId", "==", printRequestId).get(),
    ]);

    if (!requestSnap.exists) {
      requestEffects.push({
        printRequestId,
        requestName: "(missing request)",
        effect: "missing_request",
        finishableAllocationCount: finishableCount,
        predictedQueueTab: null,
      });
      continue;
    }

    const requestData = requestSnap.data() ?? {};
    const requestName = asString(requestData.name) || printRequestId;
    const requestStatus = asString(requestData.status) || "draft";
    const items = itemsSnap.docs.map((doc) => ({
      quantity: asNumber(doc.data().quantity),
    }));

    const simulatedAllocations = allAllocationsSnap.docs.map((doc) => {
      const data = doc.data();
      const status = asString(data.status) || "canceled";
      const onThisSheet = asString(data.upcomingShowId) === upcomingShowId;
      const nextStatus =
        onThisSheet && isFinishableShowAllocationStatus(status as never) ? "done" : status;
      return {
        status: nextStatus,
        allocatedQuantity: asNumber(data.allocatedQuantity),
      };
    });

    const eligibility = evaluatePrintRequestCompletionEligibility({
      requestStatus,
      items,
      allocations: simulatedAllocations,
    });

    const nextStatus = eligibility === "eligible" ? "completed" : (requestStatus as never);
    const predictedQueueTab = computePrintRequestQueueTab({
      status: nextStatus as never,
      items,
      allocations: simulatedAllocations.map((allocation) => ({
        allocatedQuantity: allocation.allocatedQuantity,
        status: allocation.status as never,
      })),
    });

    let effect: InternalGangSheetHistoricalReconciliationRequestEffect["effect"];
    if (eligibility === "already_terminal") {
      effect = "already_terminal";
      alreadyTerminalCount += 1;
    } else if (eligibility === "eligible" || predictedQueueTab === "printed") {
      effect = "would_become_printed";
      wouldBecomePrintedCount += 1;
    } else {
      effect = "remain_queued";
      remainQueuedCount += 1;
    }

    requestEffects.push({
      printRequestId,
      requestName,
      effect,
      finishableAllocationCount: finishableCount,
      predictedQueueTab,
    });
  }

  const canApply = blockers.length === 0 && finishableAllocationCount > 0;
  const notes: string[] = [];
  if (canApply) {
    notes.push(
      "Apply will mark finishable allocations on this completed sheet as done, then reconcile each affected Internal Print Request. No new Internal Gang Sheet cycle will be created.",
    );
  }
  if (remainQueuedCount > 0) {
    notes.push(
      `${remainQueuedCount} request(s) will remain Queued because unfinished work remains on other sheets.`,
    );
  }

  const previewChecksum = buildChecksum({
    upcomingShowId,
    productionStatus,
    finishableAllocationCount,
    requestEffects: requestEffects.map((effect) => ({
      printRequestId: effect.printRequestId,
      effect: effect.effect,
      finishableAllocationCount: effect.finishableAllocationCount,
    })),
  });

  return {
    upcomingShowId,
    sheetTitle,
    cycleNumber,
    productionStatus,
    canApply,
    blockers,
    finishableAllocationCount,
    alreadyDoneAllocationCount,
    canceledAllocationCount,
    skippedAllocationCount,
    affectedPrintRequestCount: requestEffects.length,
    wouldBecomePrintedCount,
    remainQueuedCount,
    alreadyTerminalCount,
    requestEffects,
    previewChecksum,
    notes,
  };
}

export async function applyInternalGangSheetHistoricalReconciliation(input: {
  upcomingShowId: string;
  actorId: string;
  previewChecksum?: string;
}): Promise<ApplyInternalGangSheetHistoricalReconciliationResponse> {
  const preview = await buildInternalGangSheetHistoricalReconciliationPreview(input.upcomingShowId);
  if (!preview.canApply) {
    if (
      preview.finishableAllocationCount === 0 &&
      preview.blockers.length === 1 &&
      preview.blockers[0]?.includes("No finishable allocations")
    ) {
      return {
        upcomingShowId: input.upcomingShowId,
        alreadyApplied: true,
        finishedAllocationCount: 0,
        affectedPrintRequestIds: [],
        becamePrintedCount: 0,
        remainQueuedCount: 0,
        notes: ["Nothing to reconcile — finishable allocations are already resolved."],
      };
    }
    throw new Error(preview.blockers[0] ?? "This Internal Gang Sheet cannot be reconciled.");
  }

  if (input.previewChecksum && input.previewChecksum !== preview.previewChecksum) {
    throw new Error("Preview is out of date. Refresh Preview and try again.");
  }

  // Re-read sheet inside apply path (preview already validated; re-assert before writes).
  const showSnap = await adminDb.collection("upcomingShows").doc(input.upcomingShowId).get();
  const showData = showSnap.data() ?? {};
  if (asString(showData.source) !== "staff_gang_sheet") {
    throw new Error("Only Internal Gang Sheets can be reconciled with this action.");
  }
  if (asString(showData.productionStatus) !== "completed") {
    throw new Error("Only completed Internal Gang Sheets in History can be reconciled.");
  }

  const affectedPrintRequestIds = await adminDb.runTransaction(async (transaction) => {
    return finishShowAllocationsInTransaction(transaction, {
      upcomingShowId: input.upcomingShowId,
      actorId: input.actorId,
    });
  });

  await reconcilePrintRequestsAfterShowFinish(affectedPrintRequestIds, input.actorId);

  let becamePrintedCount = 0;
  let remainQueuedCount = 0;
  for (const printRequestId of affectedPrintRequestIds) {
    const requestSnap = await adminDb.collection("printRequests").doc(printRequestId).get();
    const queueTab = asString(requestSnap.data()?.queueTab);
    if (queueTab === "printed" || asString(requestSnap.data()?.status) === "completed") {
      becamePrintedCount += 1;
    } else if (queueTab === "queued") {
      remainQueuedCount += 1;
    }
  }

  return {
    upcomingShowId: input.upcomingShowId,
    alreadyApplied: false,
    finishedAllocationCount: preview.finishableAllocationCount,
    affectedPrintRequestIds,
    becamePrintedCount,
    remainQueuedCount,
    notes: [
      "Completed sheet production status was left unchanged.",
      "No new Internal Gang Sheet cycle was created.",
    ],
  };
}
