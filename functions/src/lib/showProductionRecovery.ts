import { FieldValue, Timestamp, type Transaction } from "firebase-admin/firestore";

import { computePrintRequestQueueTab } from "../../../packages/shared/src/utils/printRequestQueueTabRecompute";
import { isFinishableShowAllocationStatus } from "../../../packages/shared/src/utils/showFinishAllocationStatuses";
import { isPastScheduledShow } from "../../../packages/shared/src/utils/showScheduleGrouping";
import { buildNeedsStaffRequeuePatch } from "../../../packages/shared/src/utils/printRequestStaffRequeue";
import { clearNeedsStaffRequeueAdminPatch } from "./printRequestStaffRequeueAdmin";
import {
  SHOW_REQUEUE_MAX_TRANSACTION_ALLOCATIONS,
  collectRequeueEligibleAllocations,
  isPrintRequestBlockedFromRecovery,
} from "../../../packages/shared/src/utils/showProductionRecoveryRequeue";
import type {
  ApplyShowProductionRecoveryResponse,
  PreviewShowProductionRecoveryResponse,
  ShowProductionRecoveryAction,
  ShowProductionRecoveryBlocker,
  ShowProductionRecoveryOutcome,
  ShowProductionRecoveryRequestEffect,
} from "../../../packages/shared/src/types/showProductionRecovery/showProductionRecovery.types";
import type { ShowProductionResolutionKind } from "../../../packages/shared/src/types/showProductionRecovery/showProductionRecovery.types";
import {
  computeShowAllocatedQuantityFromAllocations,
  countActiveShowAllocations,
  deriveShowNeedsAttentionReason,
  isShowQueueProductionRecoveryEligible,
  isTerminalWhatnotProductionStatus,
  isUnresolvedPastWhatnotShow,
  resolveProductionRecoveryPreviewOutcome,
  resolveProductionResolutionKindForAction,
  shouldTransitionActiveRequestToEditing,
  validateProductionOverrideReason,
} from "../../../packages/shared/src/utils/showProductionRecovery";
import { planProductionRecoveryMutation as planMutation } from "../../../packages/shared/src/utils/showProductionRecoveryPlanners";
import { isPortalEditablePrintRequest } from "../../../packages/shared/src/utils/portalPrintRequestEditability";
import {
  applyParkOrCleanupOtherContinuablesInTransaction,
  mapToContinuableParkingDocs,
} from "./portalContinuableParking";

import { adminDb } from "./admin";
import { recomputeAndPersistQueueTab } from "./printRequestQueueTab";
import {
  applyRequeueUnfulfilledRecovery,
  buildRequeuePreviewSection,
  loadFullAllocationsForShow,
  loadRecoveryShow,
  type LoadedRecoveryShow,
  type RequeueAllocationFull,
} from "./showProductionRecoveryRequeue";
import {
  finishShowAllocationsInTransaction,
  reconcilePrintRequestsAfterShowFinish,
} from "./staffGangSheetShowFinishReconciliation";
import { failedPrecondition, invalidArgument } from "./errors";

type LoadedShow = LoadedRecoveryShow;
interface LoadedAllocation {
  id: string;
  upcomingShowId: string;
  printRequestId: string;
  status: string;
  allocatedQuantity: number;
  requestNameSnapshot?: string;
}

function showLabel(data: LoadedShow): string {
  const title = typeof data.title === "string" && data.title.trim() ? data.title.trim() : "Show";
  const date = data.scheduledStartAt?.toDate?.();
  const dateLabel = date ? date.toLocaleString() : null;
  return dateLabel ? `${title} (${dateLabel})` : title;
}

async function loadShow(upcomingShowId: string): Promise<LoadedShow | null> {
  return loadRecoveryShow(upcomingShowId);
}
async function loadAllocationsForShow(upcomingShowId: string): Promise<LoadedAllocation[]> {
  const snap = await adminDb
    .collection("showAllocations")
    .where("upcomingShowId", "==", upcomingShowId)
    .get();

  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      upcomingShowId:
        typeof data.upcomingShowId === "string" ? data.upcomingShowId : upcomingShowId,
      printRequestId: typeof data.printRequestId === "string" ? data.printRequestId : "",
      status: typeof data.status === "string" ? data.status : "canceled",
      allocatedQuantity:
        typeof data.allocatedQuantity === "number" ? data.allocatedQuantity : 0,
      requestNameSnapshot:
        typeof data.requestNameSnapshot === "string" ? data.requestNameSnapshot : undefined,
    };
  });
}

async function loadAllocationsForRequest(printRequestId: string): Promise<LoadedAllocation[]> {
  const snap = await adminDb
    .collection("showAllocations")
    .where("printRequestId", "==", printRequestId)
    .get();

  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      upcomingShowId: typeof data.upcomingShowId === "string" ? data.upcomingShowId : "",
      printRequestId,
      status: typeof data.status === "string" ? data.status : "canceled",
      allocatedQuantity:
        typeof data.allocatedQuantity === "number" ? data.allocatedQuantity : 0,
      requestNameSnapshot:
        typeof data.requestNameSnapshot === "string" ? data.requestNameSnapshot : undefined,
    };
  });
}

async function customerHasOtherActiveEditingRequest(
  customerId: string,
  excludePrintRequestId: string,
): Promise<boolean> {
  const snap = await adminDb
    .collection("printRequests")
    .where("customerId", "==", customerId)
    .where("status", "==", "editing")
    .limit(2)
    .get();

  return snap.docs.some(
    (doc) =>
      doc.id !== excludePrintRequestId &&
      isPortalEditablePrintRequest({
        status: "editing",
        requestOrigin: typeof doc.data().requestOrigin === "string" ? doc.data().requestOrigin : undefined,
        isInternal: doc.data().isInternal === true,
      }),
  );
}

async function predictRequestEffect(
  printRequestId: string,
  upcomingShowId: string,
  action: ShowProductionRecoveryAction,
  allocationsOnShow: LoadedAllocation[],
  options?: {
    targetUpcomingShowId?: string;
    requeueEligibleAllocations?: LoadedAllocation[];
  },
): Promise<ShowProductionRecoveryRequestEffect | null> {
  const requestSnap = await adminDb.collection("printRequests").doc(printRequestId).get();
  if (!requestSnap.exists) {
    return null;
  }
  const requestData = requestSnap.data() ?? {};
  const currentStatus = typeof requestData.status === "string" ? requestData.status : "draft";
  const isInternal = requestData.isInternal === true;
  const customerId =
    typeof requestData.customerId === "string" ? requestData.customerId : "";

  const allAllocations = await loadAllocationsForRequest(printRequestId);
  const requeueEligibleOnSource =
    options?.requeueEligibleAllocations?.filter(
      (allocation) => allocation.printRequestId === printRequestId,
    ) ?? [];

  const simulatedAllocations = allAllocations.map((allocation) => {
    if (allocation.upcomingShowId !== upcomingShowId) {
      return allocation;
    }
    if (allocation.status === "canceled") {
      return allocation;
    }
    if (action === "requeue_unfulfilled") {
      if (
        requeueEligibleOnSource.some((eligible) => eligible.id === allocation.id) &&
        isFinishableShowAllocationStatus(allocation.status as never)
      ) {
        return { ...allocation, status: "canceled" };
      }
      return allocation;
    }
    if (action === "release_unfulfilled" || action === "force_completed") {
      const plan = planMutation(action, {
        productionStatus: "open",
        upcomingShowId,
        allocationsOnShow,
      });
      if (plan.cancelAllocations) {
        return { ...allocation, status: "canceled" };
      }
    }
    if (action === "mark_fulfilled" || action === "force_completed") {
      const plan = planMutation(action, {
        productionStatus: "open",
        upcomingShowId,
        allocationsOnShow,
      });
      if (plan.finishAllocations && isFinishableShowAllocationStatus(allocation.status as never)) {
        return { ...allocation, status: "done" };
      }
    }
    return allocation;
  });

  let simulatedWithTarget = simulatedAllocations;
  if (action === "requeue_unfulfilled" && options?.targetUpcomingShowId) {
    simulatedWithTarget = [
      ...simulatedAllocations,
      ...requeueEligibleOnSource.map((allocation) => ({
        ...allocation,
        upcomingShowId: options.targetUpcomingShowId!,
        status: "pending",
      })),
    ];
  }

  // Requeue preview must not treat planned destination replacements as pre-existing other-show work.
  const allocationsForOtherShowWarning =
    action === "requeue_unfulfilled" ? simulatedAllocations : simulatedWithTarget;
  const otherShowAllocations = allocationsForOtherShowWarning.filter(
    (allocation) =>
      allocation.upcomingShowId !== upcomingShowId && allocation.status !== "canceled",
  );

  const hasActiveGlobally = simulatedWithTarget.some(
    (allocation) => allocation.status !== "canceled",
  );

  let predictedStatus = currentStatus;
  if (action === "requeue_unfulfilled") {
    if (currentStatus === "draft" || currentStatus === "editing") {
      predictedStatus = "active";
    }
  } else if (
    shouldTransitionActiveRequestToEditing({
      requestStatus: currentStatus,
      hasActiveAllocationsGlobally: hasActiveGlobally,
      hasOtherContinuableRequest: customerId
        ? await customerHasOtherActiveEditingRequest(customerId, printRequestId)
        : false,
      isInternal,
    })
  ) {
    predictedStatus = "editing";
  }
  const itemsSnap = await adminDb
    .collection("printRequestItems")
    .where("printRequestId", "==", printRequestId)
    .get();

  const predictedQueueTab = computePrintRequestQueueTab({
    status: predictedStatus as "draft" | "active" | "editing" | "completed" | "archived",
    items: itemsSnap.docs.map((doc) => ({
      quantity: typeof doc.data().quantity === "number" ? doc.data().quantity : 0,
    })),
    allocations: simulatedWithTarget.map((allocation) => ({
      allocatedQuantity: allocation.allocatedQuantity,
      status: allocation.status as "pending" | "queued" | "in_progress" | "printed" | "done" | "canceled",
    })),
  });

  const name =
    allocationsOnShow.find((allocation) => allocation.printRequestId === printRequestId)
      ?.requestNameSnapshot ??
    (typeof requestData.name === "string" ? requestData.name : printRequestId);

  return {
    printRequestId,
    requestNameSnapshot: name,
    currentPersistedStatus: currentStatus,
    predictedPersistedStatus: predictedStatus,
    predictedQueueTab,
    otherShowAllocationCount: otherShowAllocations.length,
    otherShowAllocationQuantity: otherShowAllocations.reduce(
      (sum, allocation) => sum + allocation.allocatedQuantity,
      0,
    ),
  };
}

function blockersForOutcome(
  outcome: ShowProductionRecoveryOutcome,
  action: ShowProductionRecoveryAction,
  counts: { activeAllocationCount: number; finishableAllocationCount: number },
  options?: {
    overrideReason?: string;
    targetValidation?: { valid: boolean; code?: string; message?: string };
    capacityBlocker?: PreviewShowProductionRecoveryResponse["capacityBlocker"];
    convertedRequestBlockers?: ShowProductionRecoveryBlocker[];
  },
): ShowProductionRecoveryBlocker[] {
  if (options?.convertedRequestBlockers?.length) {
    return options.convertedRequestBlockers;
  }
  if (outcome === "already_terminal") {
    return [{ code: "already_terminal", message: "This show is already in a terminal production state." }];
  }
  if (outcome === "invalid_action") {
    return [{ code: "invalid_action", message: "This action is not valid for this show." }];
  }
  if (outcome === "blocked" && action === "force_completed") {
    const reasonError = validateProductionOverrideReason(options?.overrideReason);
    if (reasonError) {
      return [{ code: "override_reason_required", message: reasonError }];
    }
  }
  if (outcome === "blocked" && action === "close_empty" && counts.activeAllocationCount > 0) {
    return [
      {
        code: "has_allocations",
        message: "Close Empty Show requires zero active allocations on this show.",
      },
    ];
  }
  if (outcome === "blocked" && action === "mark_fulfilled" && counts.finishableAllocationCount === 0) {
    return [
      {
        code: "no_finishable_allocations",
        message: "Mark as Fulfilled requires finishable allocations on this show.",
      },
    ];
  }
  if (outcome === "blocked" && action === "release_unfulfilled" && counts.activeAllocationCount === 0) {
    return [
      {
        code: "no_active_allocations",
        message: "Release requires active allocations on this show.",
      },
    ];
  }
  if (outcome === "blocked" && action === "requeue_unfulfilled") {
    if (options?.targetValidation && options.targetValidation.valid === false) {
      return [
        {
          code: options.targetValidation.code ?? "target_ineligible",
          message: options.targetValidation.message ?? "The selected destination show is not eligible.",
        },
      ];
    }
    if (counts.finishableAllocationCount === 0) {
      return [
        {
          code: "no_finishable_allocations",
          message:
            "Requeue requires finishable allocations on this show. Use Mark Fulfilled if work was already printed.",
        },
      ];
    }
    if (counts.finishableAllocationCount > SHOW_REQUEUE_MAX_TRANSACTION_ALLOCATIONS) {
      return [
        {
          code: "too_many_allocations",
          message: `Requeue supports at most ${SHOW_REQUEUE_MAX_TRANSACTION_ALLOCATIONS} finishable allocations per apply.`,
        },
      ];
    }
    if (options?.capacityBlocker) {
      return [
        {
          code: options.capacityBlocker.code,
          message: options.capacityBlocker.message,
        },
      ];
    }
  }
  if (outcome === "blocked") {
    return [{ code: "blocked", message: "This action cannot be applied to the current show state." }];
  }
  return [];
}
export async function buildShowProductionRecoveryPreview(input: {
  upcomingShowId: string;
  action: ShowProductionRecoveryAction;
  overrideReason?: string;
  targetUpcomingShowId?: string;
}): Promise<PreviewShowProductionRecoveryResponse> {  const show = await loadShow(input.upcomingShowId);
  if (!show) {
    return {
      outcome: "blocked",
      action: input.action,
      upcomingShowId: input.upcomingShowId,
      showLabel: "Show",
      productionStatus: "open",
      blockers: [{ code: "not_found", message: "Show not found." }],
      notes: [],
      activeAllocationCount: 0,
      finishableAllocationCount: 0,
      activeAllocationQuantity: 0,
      affectedPrintRequestCount: 0,
      productionStarted: false,
      otherShowAllocationWarning: false,
      requestEffects: [],
      predictedResolutionKind: null,
    };
  }

  const allocations =
    input.action === "requeue_unfulfilled"
      ? await loadFullAllocationsForShow(input.upcomingShowId)
      : await loadAllocationsForShow(input.upcomingShowId);
  const counts = countActiveShowAllocations(allocations, input.upcomingShowId);
  const now = new Date();
  const isPast = isPastScheduledShow(show, now);
  const isWhatnot = isShowQueueProductionRecoveryEligible(show);

  const requeueSection =
    input.action === "requeue_unfulfilled"
      ? await buildRequeuePreviewSection({
          sourceShowId: input.upcomingShowId,
          sourceShow: show,
          targetUpcomingShowId: input.targetUpcomingShowId,
          allocations: allocations as RequeueAllocationFull[],
          now,
        })
      : null;

  const outcome = resolveProductionRecoveryPreviewOutcome(input.action, {
    productionStatus: show.productionStatus,
    isPast,
    isWhatnot,
    activeAllocationCount: counts.activeCount,
    finishableAllocationCount: counts.finishableCount,
    overrideReason: input.overrideReason,
    targetUpcomingShowId: input.targetUpcomingShowId,
    requeueTargetValid: requeueSection?.targetValidation?.valid,
    requeueCapacityValid: requeueSection?.capacityBlocker == null,
  });

  const requeueEligibleAllocations =
    input.action === "requeue_unfulfilled"
      ? collectRequeueEligibleAllocations(
          allocations.map((allocation) => ({
            id: allocation.id,
            upcomingShowId: allocation.upcomingShowId,
            printRequestId: allocation.printRequestId,
            requestNameSnapshot: allocation.requestNameSnapshot,
            allocatedQuantity: allocation.allocatedQuantity,
            status: allocation.status,
          })),
          input.upcomingShowId,
        )
      : [];

  const printRequestIds =
    input.action === "requeue_unfulfilled"
      ? [...new Set(requeueEligibleAllocations.map((allocation) => allocation.printRequestId).filter(Boolean))]
      : [
          ...new Set(
            allocations
              .filter((allocation) => allocation.status !== "canceled")
              .map((allocation) => allocation.printRequestId)
              .filter(Boolean),
          ),
        ];
  const requestEffects: ShowProductionRecoveryRequestEffect[] = [];
  for (const printRequestId of printRequestIds) {
    try {
      const effect = await predictRequestEffect(
        printRequestId,
        input.upcomingShowId,
        input.action,
        allocations,
        input.action === "requeue_unfulfilled"
          ? {
              targetUpcomingShowId: input.targetUpcomingShowId,
              requeueEligibleAllocations: requeueEligibleAllocations.map((allocation) => ({
                id: allocation.id,
                upcomingShowId: allocation.upcomingShowId,
                printRequestId: allocation.printRequestId,
                status: allocation.status,
                allocatedQuantity: allocation.allocatedQuantity,
                requestNameSnapshot: allocation.requestNameSnapshot,
              })),
            }
          : undefined,
      );      if (effect) {
        requestEffects.push(effect);
      }
    } catch {
      requestEffects.push({
        printRequestId,
        requestNameSnapshot: printRequestId,
        currentPersistedStatus: "unknown",
        predictedPersistedStatus: "unknown",
        predictedQueueTab: null,
        otherShowAllocationCount: 0,
        otherShowAllocationQuantity: 0,
      });
    }
  }

  const otherShowAllocationWarning =
    input.action === "requeue_unfulfilled"
      ? (requeueSection?.requeueLines?.some((line) => line.otherShowAllocationQuantity > 0) ??
        false)
      : requestEffects.some((effect) => effect.otherShowAllocationCount > 0);

  const notes: string[] = [];
  if (outcome === "applied" || outcome === "already_terminal") {
    if (input.action === "close_empty") {
      notes.push("Completes the show without changing Print Requests or allocations.");
    }
    if (input.action === "mark_fulfilled") {
      notes.push("Marks show allocations done and reconciles Print Request completion globally.");
    }
    if (input.action === "release_unfulfilled") {
      notes.push("Cancels this show's allocations and reconciles each Print Request globally.");
    }
    if (input.action === "requeue_unfulfilled") {
      notes.push(
        "Cancels finishable allocations on the missed show, creates replacements on the target show, and completes the source as Did Not Print.",
      );
    }    if (input.action === "force_completed") {
      notes.push("Owner override — reconciles allocations and requests before completing the show.");
    }
  }

  const convertedRequestBlockers = requeueSection?.convertedRequestBlockers ?? [];
  const effectiveOutcome =
    convertedRequestBlockers.length > 0 && outcome === "applied" ? "blocked" : outcome;

  return {
    outcome: effectiveOutcome,
    action: input.action,
    upcomingShowId: input.upcomingShowId,
    showLabel: showLabel(show),
    productionStatus: show.productionStatus,
    blockers: blockersForOutcome(effectiveOutcome, input.action, {
      activeAllocationCount: counts.activeCount,
      finishableAllocationCount: counts.finishableCount,
    }, {
      overrideReason: input.overrideReason,
      targetValidation: requeueSection?.targetValidation,
      capacityBlocker: requeueSection?.capacityBlocker,
      convertedRequestBlockers,
    }),    notes,
    activeAllocationCount: counts.activeCount,
    finishableAllocationCount: counts.finishableCount,
    activeAllocationQuantity: counts.activeQuantity,
    affectedPrintRequestCount: printRequestIds.length,
    productionStarted: show.printStartedAt != null,
    otherShowAllocationWarning,
    requestEffects,
    predictedResolutionKind:
      effectiveOutcome === "applied" || effectiveOutcome === "already_terminal"
        ? resolveProductionResolutionKindForAction(input.action)
        : null,
    previewChecksum: requeueSection?.previewChecksum,
    targetShow: requeueSection?.targetShow,
    requeueLines: requeueSection?.requeueLines,
    totalRequeueQuantity: requeueSection?.totalRequeueQuantity,
    capacityBlocker: requeueSection?.capacityBlocker,
  };
}
async function cancelShowAllocationsInTransaction(
  transaction: Transaction,
  input: { upcomingShowId: string; actorId: string },
): Promise<{ printRequestIds: string[]; releasedQuantityByRequest: Record<string, number> }> {
  const allocationsQuery = adminDb
    .collection("showAllocations")
    .where("upcomingShowId", "==", input.upcomingShowId);
  const allocationsSnap = await transaction.get(allocationsQuery);
  const printRequestIds = new Set<string>();
  const releasedQuantityByRequest: Record<string, number> = {};

  for (const allocationDoc of allocationsSnap.docs) {
    const data = allocationDoc.data();
    const status = typeof data.status === "string" ? data.status : "canceled";
    if (status === "canceled") {
      continue;
    }
    const printRequestId = typeof data.printRequestId === "string" ? data.printRequestId : "";
    const allocatedQuantity =
      typeof data.allocatedQuantity === "number" ? data.allocatedQuantity : 0;
    if (printRequestId) {
      printRequestIds.add(printRequestId);
      releasedQuantityByRequest[printRequestId] =
        (releasedQuantityByRequest[printRequestId] ?? 0) + allocatedQuantity;
    }
    transaction.update(allocationDoc.ref, {
      status: "canceled",
      canceledAt: FieldValue.serverTimestamp(),
      canceledBy: input.actorId,
      updatedBy: input.actorId,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  return { printRequestIds: [...printRequestIds], releasedQuantityByRequest };
}
async function reconcileRequestAfterRelease(
  printRequestId: string,
  actorId: string,
  sourceContext: {
    sourceShowId: string;
    sourceShowTitleSnapshot: string;
    releasedQuantity: number;
  },
): Promise<void> {
  const requestRef = adminDb.collection("printRequests").doc(printRequestId);
  const requestSnap = await requestRef.get();
  if (!requestSnap.exists) {
    return;
  }

  const requestData = requestSnap.data() ?? {};
  const status = typeof requestData.status === "string" ? requestData.status : "draft";
  const isInternal = requestData.isInternal === true;
  const customerId = typeof requestData.customerId === "string" ? requestData.customerId : "";

  if (
    isPrintRequestBlockedFromRecovery({
      closureKind:
        requestData.closureKind === "converted_to_internal" ? "converted_to_internal" : undefined,
      convertedToInternalRequestId:
        typeof requestData.convertedToInternalRequestId === "string"
          ? requestData.convertedToInternalRequestId
          : undefined,
    })
  ) {
    await recomputeAndPersistQueueTab(printRequestId);
    return;
  }

  const allocationsSnap = await adminDb
    .collection("showAllocations")
    .where("printRequestId", "==", printRequestId)
    .get();

  const hasActiveGlobally = allocationsSnap.docs.some(
    (doc) => doc.data().status !== "canceled",
  );

  const requestPatch: Record<string, unknown> = {
    updatedBy: actorId,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (
    shouldTransitionActiveRequestToEditing({
      requestStatus: status,
      hasActiveAllocationsGlobally: hasActiveGlobally,
      hasOtherContinuableRequest: customerId
        ? await customerHasOtherActiveEditingRequest(customerId, printRequestId)
        : false,
      isInternal,
    })
  ) {
    requestPatch.status = "editing";
    
    // Apply parking logic for customer requests when transitioning to editing
    if (!isInternal && customerId) {
      await adminDb.runTransaction(async (transaction) => {
        const continuablesSnap = await transaction.get(
          adminDb
            .collection("printRequests")
            .where("customerId", "==", customerId)
            .where("status", "in", ["draft", "editing"])
            .limit(4)
        );
        
        const continuableDocs = mapToContinuableParkingDocs(continuablesSnap.docs);
        const requestRef = adminDb.collection("printRequests").doc(printRequestId);
        
        const parkResult = applyParkOrCleanupOtherContinuablesInTransaction(transaction, {
          customerId,
          editingRequestRef: requestRef,
          editingPrintRequestId: printRequestId,
          actorId: actorId,
          otherContinuableDocs: continuableDocs,
        });
        
        if (parkResult.parkedDraftId) {
          requestPatch.parksDraftPrintRequestId = parkResult.parkedDraftId;
        }
        
        // Apply the status update within the transaction
        transaction.update(requestRef, requestPatch);
      });
      
      // Skip the regular update since we did it in the transaction
      await recomputeAndPersistQueueTab(printRequestId);
      return;
    }
  }

  if (!hasActiveGlobally && sourceContext.releasedQuantity > 0) {
    const requeueMarker = buildNeedsStaffRequeuePatch({
      sourceShowId: sourceContext.sourceShowId,
      sourceShowTitleSnapshot: sourceContext.sourceShowTitleSnapshot,
      releasedQuantity: sourceContext.releasedQuantity,
      markedAt: Timestamp.now(),
    });
    Object.assign(requestPatch, {
      needsStaffRequeueSourceShowId: requeueMarker.needsStaffRequeueSourceShowId,
      needsStaffRequeueSourceShowTitleSnapshot:
        requeueMarker.needsStaffRequeueSourceShowTitleSnapshot,
      needsStaffRequeueReleasedQuantity: requeueMarker.needsStaffRequeueReleasedQuantity,
      needsStaffRequeueAt: FieldValue.serverTimestamp(),
    });
  } else {
    Object.assign(requestPatch, clearNeedsStaffRequeueAdminPatch());
  }

  await requestRef.update(requestPatch);
  await recomputeAndPersistQueueTab(printRequestId);
}
function buildShowCompletionPatch(input: {
  actorId: string;
  resolutionKind: ShowProductionResolutionKind;
  overrideReason?: string;
  includeFinishTimerFields: boolean;
}): Record<string, unknown> {
  const patch: Record<string, unknown> = {
    productionStatus: "completed",
    productionResolutionKind: input.resolutionKind,
    productionResolvedAt: FieldValue.serverTimestamp(),
    productionResolvedBy: input.actorId,
    updatedBy: input.actorId,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.overrideReason) {
    patch.productionOverrideReason = input.overrideReason.trim();
  }

  if (input.includeFinishTimerFields) {
    patch.printFinishedAt = FieldValue.serverTimestamp();
    patch.printFinishedBy = input.actorId;
    patch.activePrintStartedAt = FieldValue.delete();
    patch.printPausedAt = FieldValue.delete();
  }

  return patch;
}

export async function applyShowProductionRecovery(input: {
  upcomingShowId: string;
  action: ShowProductionRecoveryAction;
  actorId: string;
  overrideReason?: string;
  targetUpcomingShowId?: string;
  previewChecksum?: string;
}): Promise<ApplyShowProductionRecoveryResponse> {
  if (input.action === "requeue_unfulfilled") {
    const preview = await buildShowProductionRecoveryPreview({
      upcomingShowId: input.upcomingShowId,
      action: input.action,
      targetUpcomingShowId: input.targetUpcomingShowId,
    });

    if (preview.outcome === "already_terminal") {
      return {
        outcome: "already_terminal",
        action: input.action,
        upcomingShowId: input.upcomingShowId,
        message: "Show is already in a terminal production state.",
        affectedPrintRequestIds: [],
      };
    }

    if (preview.outcome !== "applied") {
      return {
        outcome: preview.outcome,
        action: input.action,
        upcomingShowId: input.upcomingShowId,
        message: preview.blockers[0]?.message ?? "Action blocked.",
        blockers: preview.blockers,
        affectedPrintRequestIds: [],
      };
    }

    const targetUpcomingShowId = input.targetUpcomingShowId?.trim();
    const previewChecksum = input.previewChecksum?.trim();
    if (!targetUpcomingShowId || !previewChecksum) {
      throw invalidArgument("Destination show and preview checksum are required for requeue apply.");
    }

    if (preview.previewChecksum && preview.previewChecksum !== previewChecksum) {
      throw failedPrecondition("Show state changed. Refresh preview and try again.");
    }

    return applyRequeueUnfulfilledRecovery({
      upcomingShowId: input.upcomingShowId,
      targetUpcomingShowId,
      previewChecksum,
      actorId: input.actorId,
    });
  }

  const preview = await buildShowProductionRecoveryPreview({
    upcomingShowId: input.upcomingShowId,
    action: input.action,
    overrideReason: input.overrideReason,
  });
  if (preview.outcome === "already_terminal") {
    return {
      outcome: "already_terminal",
      action: input.action,
      upcomingShowId: input.upcomingShowId,
      message: "Show is already in a terminal production state.",
      affectedPrintRequestIds: [],
      productionResolutionKind: undefined,
    };
  }

  if (preview.outcome !== "applied") {
    return {
      outcome: preview.outcome,
      action: input.action,
      upcomingShowId: input.upcomingShowId,
      message: preview.blockers[0]?.message ?? "Action blocked.",
      blockers: preview.blockers,
      affectedPrintRequestIds: [],
    };
  }

  const show = await loadShow(input.upcomingShowId);
  if (!show) {
    throw invalidArgument("Show not found.");
  }

  const sourceShowTitleSnapshot = showLabel(show);
  const allocations = await loadAllocationsForShow(input.upcomingShowId);  const mutationPlan = planMutation(input.action, {
    productionStatus: show.productionStatus,
    upcomingShowId: input.upcomingShowId,
    allocationsOnShow: allocations,
  });

  if (!mutationPlan.canApply) {
    throw failedPrecondition("Show state changed. Refresh and try again.");
  }

  const resolutionKind = resolveProductionResolutionKindForAction(input.action);
  const showRef = adminDb.collection("upcomingShows").doc(input.upcomingShowId);
  let affectedPrintRequestIds: string[] = [];
  let releasedQuantityByRequest: Record<string, number> = {};
  if (input.action === "close_empty") {
    await showRef.update(
      buildShowCompletionPatch({
        actorId: input.actorId,
        resolutionKind,
        overrideReason: input.overrideReason,
        includeFinishTimerFields: false,
      }),
    );
  } else if (mutationPlan.finishAllocations) {
    await adminDb.runTransaction(async (transaction) => {
      const latestShowSnap = await transaction.get(showRef);
      if (!latestShowSnap.exists) {
        throw invalidArgument("Show not found.");
      }
      const latestStatus =
        typeof latestShowSnap.data()?.productionStatus === "string"
          ? latestShowSnap.data()!.productionStatus
          : "open";
      if (isTerminalWhatnotProductionStatus(latestStatus)) {
        return;
      }

      affectedPrintRequestIds = await finishShowAllocationsInTransaction(transaction, {
        upcomingShowId: input.upcomingShowId,
        actorId: input.actorId,
      });

      transaction.update(
        showRef,
        buildShowCompletionPatch({
          actorId: input.actorId,
          resolutionKind,
          overrideReason: input.overrideReason,
          includeFinishTimerFields: show.productionStatus === "printing",
        }),
      );
    });

    await reconcilePrintRequestsAfterShowFinish(affectedPrintRequestIds, input.actorId);
  } else if (mutationPlan.cancelAllocations) {
    await adminDb.runTransaction(async (transaction) => {
      const latestShowSnap = await transaction.get(showRef);
      if (!latestShowSnap.exists) {
        throw invalidArgument("Show not found.");
      }
      const latestStatus =
        typeof latestShowSnap.data()?.productionStatus === "string"
          ? latestShowSnap.data()!.productionStatus
          : "open";
      if (isTerminalWhatnotProductionStatus(latestStatus)) {
        return;
      }

      const cancelResult = await cancelShowAllocationsInTransaction(transaction, {
        upcomingShowId: input.upcomingShowId,
        actorId: input.actorId,
      });
      affectedPrintRequestIds = cancelResult.printRequestIds;
      releasedQuantityByRequest = cancelResult.releasedQuantityByRequest;
      transaction.update(showRef, {
        ...buildShowCompletionPatch({
          actorId: input.actorId,
          resolutionKind,
          overrideReason: input.overrideReason,
          includeFinishTimerFields: false,
        }),
        allocatedQuantity: 0,
      });
    });

    for (const printRequestId of affectedPrintRequestIds) {
      await reconcileRequestAfterRelease(printRequestId, input.actorId, {
        sourceShowId: input.upcomingShowId,
        sourceShowTitleSnapshot: show.title?.trim() || sourceShowTitleSnapshot,
        releasedQuantity: releasedQuantityByRequest[printRequestId] ?? 0,
      });
    }  }

  // Recalculate allocated quantity from authoritative allocations after commit
  const postAllocations = await loadAllocationsForShow(input.upcomingShowId);
  const recalculatedTotal = computeShowAllocatedQuantityFromAllocations(
    postAllocations,
    input.upcomingShowId,
  );
  await showRef.update({
    allocatedQuantity: recalculatedTotal,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    outcome: "applied",
    action: input.action,
    upcomingShowId: input.upcomingShowId,
    message: "Show production recovery applied.",
    affectedPrintRequestIds,
    productionResolutionKind: resolutionKind,
  };
}

export function isUnresolvedPastWhatnotShowForRecovery(
  show: LoadedShow,
  now: Date,
): boolean {
  return isUnresolvedPastWhatnotShow(show, now);
}

export function deriveNeedsAttentionReasonForShow(
  show: LoadedShow,
  allocations: LoadedAllocation[],
  now: Date,
): string {
  const counts = countActiveShowAllocations(allocations, show.id);
  return deriveShowNeedsAttentionReason({
    show,
    now,
    activeAllocationCount: counts.activeCount,
    finishableAllocationCount: counts.finishableCount,
    printStartedAtPresent: show.printStartedAt != null,
  });
}
