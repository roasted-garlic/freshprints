import { FieldValue, type DocumentSnapshot, type Transaction } from "firebase-admin/firestore";

import type {
  ApplyShowProductionRecoveryResponse,
  PreviewShowProductionRecoveryResponse,
  ShowProductionRecoveryBlocker,
  ShowProductionRequeueLine,
  ShowProductionRequeueTargetShow,
} from "../../../packages/shared/src/types/showProductionRecovery/showProductionRecovery.types";
import {
  computeShowAllocatedQuantityFromAllocations,
  isTerminalWhatnotProductionStatus,
  resolveProductionResolutionKindForAction,
} from "../../../packages/shared/src/utils/showProductionRecovery";
import { clearNeedsStaffRequeueAdminPatch } from "./printRequestStaffRequeueAdmin";
import {
  buildRequeueLines,
  buildShowProductionRecoveryPreviewChecksum,
  buildShowProductionRequeueTargetShow,
  collectRequeueEligibleAllocations,
  computeRequeueCapacityProjection,
  isPrintRequestBlockedFromRecovery,
  sumRequeueEligibleQuantity,
  validateRequeueTargetShow,
  verifyShowProductionRecoveryPreviewChecksum,
  type RequeueAllocationSnapshot,
  type RequeueTargetShowInput,
  type RequeueTargetValidationResult,
} from "../../../packages/shared/src/utils/showProductionRecoveryRequeue";
import { withoutUndefinedFields } from "./firestoreDocument";
import {
  applyRestoreParkedDraftWritesInTransaction,
  readParkedDraftForRestoreInTransaction,
  type ParkedDraftRestoreRead,
} from "./portalContinuableParking";

import { adminDb } from "./admin";
import { recomputeAndPersistQueueTab } from "./printRequestQueueTab";
import { failedPrecondition, invalidArgument } from "./errors";

export interface LoadedRecoveryShow {
  id: string;
  source: string;
  title?: string;
  productionStatus: string;
  scheduledStartAt?: { toDate: () => Date; toMillis?: () => number };
  printStartedAt?: unknown;
  allocatedQuantity: number;
  maxTotalQuantity?: number;
}

export interface RequeueAllocationFull extends RequeueAllocationSnapshot {
  printRequestItemId: string;
  designId?: string;
  sourceType?: string;
  customerUploadId?: string;
  customerId?: string;
  requestOriginSnapshot?: string;
  designTitleSnapshot?: string;
  sourceItemQuantitySnapshot: number;
  printWidthInches?: number;
  printHeightInches?: number;
  sizeLabel?: string;
  notes?: string;
}

const RECOVERY_APPLICATIONS_COLLECTION = "showProductionRecoveryApplications";

export async function loadRecoveryShow(upcomingShowId: string): Promise<LoadedRecoveryShow | null> {
  const snap = await adminDb.collection("upcomingShows").doc(upcomingShowId).get();
  if (!snap.exists) {
    return null;
  }
  const data = snap.data() ?? {};
  return {
    id: snap.id,
    source: typeof data.source === "string" ? data.source : "whatnot",
    title: typeof data.title === "string" ? data.title : undefined,
    productionStatus: typeof data.productionStatus === "string" ? data.productionStatus : "open",
    scheduledStartAt: data.scheduledStartAt as LoadedRecoveryShow["scheduledStartAt"],
    printStartedAt: data.printStartedAt,
    allocatedQuantity:
      typeof data.allocatedQuantity === "number" && Number.isFinite(data.allocatedQuantity)
        ? data.allocatedQuantity
        : 0,
    maxTotalQuantity:
      typeof data.maxTotalQuantity === "number" && Number.isFinite(data.maxTotalQuantity)
        ? data.maxTotalQuantity
        : undefined,
  };
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export async function loadFullAllocationsForShow(
  upcomingShowId: string,
): Promise<RequeueAllocationFull[]> {
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
      printRequestItemId:
        typeof data.printRequestItemId === "string" ? data.printRequestItemId : "",
      designId: readOptionalString(data.designId),
      sourceType: readOptionalString(data.sourceType),
      customerUploadId: readOptionalString(data.customerUploadId),
      customerId: readOptionalString(data.customerId),
      requestNameSnapshot: readOptionalString(data.requestNameSnapshot),
      requestOriginSnapshot: readOptionalString(data.requestOriginSnapshot),
      designTitleSnapshot: readOptionalString(data.designTitleSnapshot),
      allocatedQuantity:
        typeof data.allocatedQuantity === "number" ? data.allocatedQuantity : 0,
      sourceItemQuantitySnapshot:
        typeof data.sourceItemQuantitySnapshot === "number"
          ? data.sourceItemQuantitySnapshot
          : typeof data.allocatedQuantity === "number"
            ? data.allocatedQuantity
            : 0,
      printWidthInches: readOptionalNumber(data.printWidthInches),
      printHeightInches: readOptionalNumber(data.printHeightInches),
      sizeLabel: readOptionalString(data.sizeLabel),
      notes: readOptionalString(data.notes),
      status: typeof data.status === "string" ? data.status : "canceled",
    };
  });
}

function toRequeueTargetShowInput(show: LoadedRecoveryShow): RequeueTargetShowInput {
  return {
    id: show.id,
    title: show.title ?? null,
    source: show.source,
    scheduledStartAt: show.scheduledStartAt ?? null,
    productionStatus: show.productionStatus,
    maxTotalQuantity: show.maxTotalQuantity,
    allocatedQuantity: show.allocatedQuantity,
  };
}

function toAllocationSnapshots(allocations: readonly RequeueAllocationFull[]): RequeueAllocationSnapshot[] {
  return allocations.map((allocation) => ({
    id: allocation.id,
    upcomingShowId: allocation.upcomingShowId,
    printRequestId: allocation.printRequestId,
    printRequestItemId: allocation.printRequestItemId,
    requestNameSnapshot: allocation.requestNameSnapshot,
    allocatedQuantity: allocation.allocatedQuantity,
    status: allocation.status,
  }));
}

async function loadAllocationSnapshotsForRequeueLines(
  eligibleAllocations: readonly RequeueAllocationSnapshot[],
): Promise<RequeueAllocationSnapshot[]> {
  const printRequestIds = [
    ...new Set(eligibleAllocations.map((allocation) => allocation.printRequestId).filter(Boolean)),
  ];

  if (printRequestIds.length === 0) {
    return [];
  }

  const snapshots: RequeueAllocationSnapshot[] = [];

  for (const printRequestId of printRequestIds) {
    const snap = await adminDb
      .collection("showAllocations")
      .where("printRequestId", "==", printRequestId)
      .get();

    for (const doc of snap.docs) {
      const data = doc.data();
      snapshots.push({
        id: doc.id,
        upcomingShowId: typeof data.upcomingShowId === "string" ? data.upcomingShowId : "",
        printRequestId,
        printRequestItemId:
          typeof data.printRequestItemId === "string" ? data.printRequestItemId : undefined,
        requestNameSnapshot: readOptionalString(data.requestNameSnapshot),
        allocatedQuantity:
          typeof data.allocatedQuantity === "number" && Number.isFinite(data.allocatedQuantity)
            ? data.allocatedQuantity
            : 0,
        status: typeof data.status === "string" ? data.status : "canceled",
      });
    }
  }

  return snapshots;
}

async function findConvertedRequestBlockers(
  eligibleAllocations: readonly RequeueAllocationSnapshot[],
): Promise<ShowProductionRecoveryBlocker[]> {
  const printRequestIds = [
    ...new Set(eligibleAllocations.map((allocation) => allocation.printRequestId).filter(Boolean)),
  ];
  const blockers: ShowProductionRecoveryBlocker[] = [];

  for (const printRequestId of printRequestIds) {
    const requestSnap = await adminDb.collection("printRequests").doc(printRequestId).get();
    if (!requestSnap.exists) {
      continue;
    }
    const requestData = requestSnap.data() ?? {};
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
      blockers.push({
        code: "converted_request",
        message: `Print request ${printRequestId} was converted to an internal request and cannot be requeued.`,
      });
    }
  }

  return blockers;
}

export interface RequeuePreviewSection {
  eligibleRequeueAllocations: RequeueAllocationSnapshot[];
  requeueLines?: ShowProductionRequeueLine[];
  totalRequeueQuantity?: number;
  targetValidation?: RequeueTargetValidationResult;
  targetShow?: ShowProductionRequeueTargetShow;
  capacityBlocker?: PreviewShowProductionRecoveryResponse["capacityBlocker"];
  previewChecksum?: string;
  convertedRequestBlockers: ShowProductionRecoveryBlocker[];
}

export async function buildRequeuePreviewSection(input: {
  sourceShowId: string;
  sourceShow: LoadedRecoveryShow;
  targetUpcomingShowId?: string;
  allocations: readonly RequeueAllocationFull[];
  now?: Date;
}): Promise<RequeuePreviewSection> {
  const now = input.now ?? new Date();
  const snapshots = toAllocationSnapshots(input.allocations);
  const eligibleRequeueAllocations = collectRequeueEligibleAllocations(
    snapshots,
    input.sourceShowId,
  );
  const requeueLines = buildRequeueLines(
    eligibleRequeueAllocations,
    await loadAllocationSnapshotsForRequeueLines(eligibleRequeueAllocations),
    input.sourceShowId,
  );
  const totalRequeueQuantity = sumRequeueEligibleQuantity(snapshots, input.sourceShowId);

  let targetShow: LoadedRecoveryShow | null = null;
  if (input.targetUpcomingShowId?.trim()) {
    targetShow = await loadRecoveryShow(input.targetUpcomingShowId.trim());
  }

  const targetValidation = validateRequeueTargetShow(
    input.sourceShowId,
    input.targetUpcomingShowId,
    targetShow ? toRequeueTargetShowInput(targetShow) : null,
    now,
  );

  const capacityProjection =
    targetShow && totalRequeueQuantity > 0
      ? computeRequeueCapacityProjection({
          targetShow,
          totalRequeueQuantity,
        })
      : undefined;

  const targetShowSummary =
    targetShow && totalRequeueQuantity > 0
      ? buildShowProductionRequeueTargetShow(toRequeueTargetShowInput(targetShow), totalRequeueQuantity)
      : undefined;

  const predictedResolutionKind = resolveProductionResolutionKindForAction("requeue_unfulfilled");
  const previewChecksum =
    targetValidation.valid &&
    capacityProjection?.capacityBlocker == null &&
    eligibleRequeueAllocations.length > 0 &&
    input.targetUpcomingShowId?.trim()
      ? buildShowProductionRecoveryPreviewChecksum({
          upcomingShowId: input.sourceShowId,
          action: "requeue_unfulfilled",
          targetUpcomingShowId: input.targetUpcomingShowId.trim(),
          sourceProductionStatus: input.sourceShow.productionStatus,
          predictedResolutionKind,
          sourceAllocations: eligibleRequeueAllocations,
          targetShow: {
            id: targetShow!.id,
            maxTotalQuantity: targetShow!.maxTotalQuantity,
            allocatedQuantity: targetShow!.allocatedQuantity,
          },
        })
      : undefined;

  const convertedRequestBlockers = await findConvertedRequestBlockers(eligibleRequeueAllocations);

  return {
    eligibleRequeueAllocations,
    requeueLines,
    totalRequeueQuantity,
    targetValidation,
    targetShow: targetShowSummary,
    capacityBlocker: capacityProjection?.capacityBlocker ?? undefined,
    previewChecksum,
    convertedRequestBlockers,
  };
}

function buildShowCompletionPatch(input: {
  actorId: string;
  resolutionKind: "unfulfilled_requeue";
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

  if (input.includeFinishTimerFields) {
    patch.printFinishedAt = FieldValue.serverTimestamp();
    patch.printFinishedBy = input.actorId;
    patch.activePrintStartedAt = FieldValue.delete();
    patch.printPausedAt = FieldValue.delete();
  }

  return patch;
}

function cloneAllocationForRequeue(input: {
  sourceAllocation: RequeueAllocationFull;
  targetUpcomingShowId: string;
  actorId: string;
}): Record<string, unknown> {
  const { sourceAllocation, targetUpcomingShowId, actorId } = input;
  const timestamp = FieldValue.serverTimestamp();

  return withoutUndefinedFields({
    upcomingShowId: targetUpcomingShowId,
    printRequestId: sourceAllocation.printRequestId,
    printRequestItemId: sourceAllocation.printRequestItemId,
    designId: sourceAllocation.designId,
    sourceType: sourceAllocation.sourceType,
    customerUploadId: sourceAllocation.customerUploadId,
    customerId: sourceAllocation.customerId,
    requestNameSnapshot:
      sourceAllocation.requestNameSnapshot?.trim() || sourceAllocation.printRequestId,
    requestOriginSnapshot: sourceAllocation.requestOriginSnapshot,
    designTitleSnapshot: sourceAllocation.designTitleSnapshot,
    allocatedQuantity: sourceAllocation.allocatedQuantity,
    sourceItemQuantitySnapshot: sourceAllocation.sourceItemQuantitySnapshot,
    printWidthInches: sourceAllocation.printWidthInches,
    printHeightInches: sourceAllocation.printHeightInches,
    sizeLabel: sourceAllocation.sizeLabel,
    notes: sourceAllocation.notes,
    status: "pending",
    requeuedFromAllocationId: sourceAllocation.id,
    addedBy: actorId,
    updatedBy: actorId,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

async function loadRequestsForRequeueInTransaction(
  transaction: Transaction,
  printRequestIds: readonly string[],
): Promise<Map<string, DocumentSnapshot>> {
  const snaps = await Promise.all(
    printRequestIds.map((printRequestId) =>
      transaction.get(adminDb.collection("printRequests").doc(printRequestId)),
    ),
  );
  return new Map(printRequestIds.map((printRequestId, index) => [printRequestId, snaps[index]!]));
}

export async function applyRequeueUnfulfilledRecovery(input: {
  upcomingShowId: string;
  targetUpcomingShowId: string;
  previewChecksum: string;
  actorId: string;
}): Promise<ApplyShowProductionRecoveryResponse> {
  const previewChecksum = input.previewChecksum.trim();
  if (!previewChecksum) {
    throw invalidArgument("Preview checksum is required for requeue apply.");
  }

  const idempotencyRef = adminDb.collection(RECOVERY_APPLICATIONS_COLLECTION).doc(previewChecksum);
  const existingApplication = await idempotencyRef.get();
  if (existingApplication.exists) {
    const existingData = existingApplication.data() ?? {};
    return {
      outcome: "applied",
      action: "requeue_unfulfilled",
      upcomingShowId: input.upcomingShowId,
      message: "Show production recovery already applied.",
      affectedPrintRequestIds: Array.isArray(existingData.affectedPrintRequestIds)
        ? existingData.affectedPrintRequestIds.filter(
            (value): value is string => typeof value === "string",
          )
        : [],
      productionResolutionKind: "unfulfilled_requeue",
    };
  }

  const sourceShow = await loadRecoveryShow(input.upcomingShowId);
  if (!sourceShow) {
    throw invalidArgument("Show not found.");
  }
  if (isTerminalWhatnotProductionStatus(sourceShow.productionStatus)) {
    return {
      outcome: "already_terminal",
      action: "requeue_unfulfilled",
      upcomingShowId: input.upcomingShowId,
      message: "Show is already in a terminal production state.",
      affectedPrintRequestIds: [],
    };
  }

  const targetShowId = input.targetUpcomingShowId.trim();
  if (!targetShowId) {
    throw invalidArgument("Select a destination show.");
  }

  const sourceShowRef = adminDb.collection("upcomingShows").doc(input.upcomingShowId);
  const targetShowRef = adminDb.collection("upcomingShows").doc(targetShowId);
  let affectedPrintRequestIds: string[] = [];

  await adminDb.runTransaction(async (transaction) => {
    const [
      idempotencySnap,
      latestSourceShowSnap,
      latestTargetShowSnap,
      sourceAllocationsSnap,
      targetAllocationsSnap,
    ] = await Promise.all([
      transaction.get(idempotencyRef),
      transaction.get(sourceShowRef),
      transaction.get(targetShowRef),
      transaction.get(
        adminDb.collection("showAllocations").where("upcomingShowId", "==", input.upcomingShowId),
      ),
      transaction.get(
        adminDb.collection("showAllocations").where("upcomingShowId", "==", targetShowId),
      ),
    ]);

    if (idempotencySnap.exists) {
      const existingData = idempotencySnap.data() ?? {};
      affectedPrintRequestIds = Array.isArray(existingData.affectedPrintRequestIds)
        ? existingData.affectedPrintRequestIds.filter(
            (value): value is string => typeof value === "string",
          )
        : [];
      return;
    }

    if (!latestSourceShowSnap.exists || !latestTargetShowSnap.exists) {
      throw invalidArgument("Show not found.");
    }

    const latestSourceShow = latestSourceShowSnap.data() ?? {};
    const latestTargetShow = latestTargetShowSnap.data() ?? {};
    const latestSourceStatus =
      typeof latestSourceShow.productionStatus === "string"
        ? latestSourceShow.productionStatus
        : "open";

    if (isTerminalWhatnotProductionStatus(latestSourceStatus)) {
      return;
    }

    const sourceAllocations: RequeueAllocationFull[] = sourceAllocationsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        upcomingShowId: input.upcomingShowId,
        printRequestId: typeof data.printRequestId === "string" ? data.printRequestId : "",
        printRequestItemId:
          typeof data.printRequestItemId === "string" ? data.printRequestItemId : "",
        designId: readOptionalString(data.designId),
        sourceType: readOptionalString(data.sourceType),
        customerUploadId: readOptionalString(data.customerUploadId),
        customerId: readOptionalString(data.customerId),
        requestNameSnapshot: readOptionalString(data.requestNameSnapshot),
        requestOriginSnapshot: readOptionalString(data.requestOriginSnapshot),
        designTitleSnapshot: readOptionalString(data.designTitleSnapshot),
        allocatedQuantity:
          typeof data.allocatedQuantity === "number" ? data.allocatedQuantity : 0,
        sourceItemQuantitySnapshot:
          typeof data.sourceItemQuantitySnapshot === "number"
            ? data.sourceItemQuantitySnapshot
            : typeof data.allocatedQuantity === "number"
              ? data.allocatedQuantity
              : 0,
        printWidthInches: readOptionalNumber(data.printWidthInches),
        printHeightInches: readOptionalNumber(data.printHeightInches),
        sizeLabel: readOptionalString(data.sizeLabel),
        notes: readOptionalString(data.notes),
        status: typeof data.status === "string" ? data.status : "canceled",
      };
    });

    const eligibleAllocations = collectRequeueEligibleAllocations(
      toAllocationSnapshots(sourceAllocations),
      input.upcomingShowId,
    );

    if (eligibleAllocations.length === 0) {
      throw failedPrecondition("No finishable allocations remain on this show.");
    }

    const targetShowForValidation: LoadedRecoveryShow = {
      id: targetShowId,
      source: typeof latestTargetShow.source === "string" ? latestTargetShow.source : "whatnot",
      title: typeof latestTargetShow.title === "string" ? latestTargetShow.title : undefined,
      productionStatus:
        typeof latestTargetShow.productionStatus === "string"
          ? latestTargetShow.productionStatus
          : "open",
      scheduledStartAt: latestTargetShow.scheduledStartAt as LoadedRecoveryShow["scheduledStartAt"],
      allocatedQuantity:
        typeof latestTargetShow.allocatedQuantity === "number"
          ? latestTargetShow.allocatedQuantity
          : 0,
      maxTotalQuantity:
        typeof latestTargetShow.maxTotalQuantity === "number"
          ? latestTargetShow.maxTotalQuantity
          : undefined,
    };

    const targetValidation = validateRequeueTargetShow(
      input.upcomingShowId,
      targetShowId,
      toRequeueTargetShowInput(targetShowForValidation),
    );
    if (!targetValidation.valid) {
      throw failedPrecondition(targetValidation.message);
    }

    const totalRequeueQuantity = sumRequeueEligibleQuantity(
      toAllocationSnapshots(sourceAllocations),
      input.upcomingShowId,
    );
    const capacityProjection = computeRequeueCapacityProjection({
      targetShow: targetShowForValidation,
      totalRequeueQuantity,
    });
    if (capacityProjection.capacityBlocker) {
      throw failedPrecondition(capacityProjection.capacityBlocker.message);
    }

    const checksumValid = verifyShowProductionRecoveryPreviewChecksum(previewChecksum, {
      upcomingShowId: input.upcomingShowId,
      action: "requeue_unfulfilled",
      targetUpcomingShowId: targetShowId,
      sourceProductionStatus: latestSourceStatus,
      predictedResolutionKind: "unfulfilled_requeue",
      sourceAllocations: eligibleAllocations,
      targetShow: {
        id: targetShowId,
        maxTotalQuantity: targetShowForValidation.maxTotalQuantity,
        allocatedQuantity: targetShowForValidation.allocatedQuantity,
      },
    });
    if (!checksumValid) {
      throw failedPrecondition("Show state changed. Refresh preview and try again.");
    }

    const affectedRequestIdSet = new Set<string>();
    for (const eligible of eligibleAllocations) {
      if (eligible.printRequestId) {
        affectedRequestIdSet.add(eligible.printRequestId);
      }
    }
    const requestSnaps = await loadRequestsForRequeueInTransaction(transaction, [
      ...affectedRequestIdSet,
    ]);

    for (const printRequestId of affectedRequestIdSet) {
      const requestSnap = requestSnaps.get(printRequestId);
      if (!requestSnap?.exists) {
        throw failedPrecondition(`Print request ${printRequestId} no longer exists.`);
      }
      const requestData = requestSnap.data() ?? {};
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
        throw failedPrecondition(
          `Print request ${printRequestId} was converted to an internal request and cannot be requeued.`,
        );
      }
    }

    // Reads before writes: preload parked-draft snaps for editing→active restores.
    const parkedRestoreByRequestId = new Map<string, ParkedDraftRestoreRead | null>();
    for (const printRequestId of affectedRequestIdSet) {
      const requestSnap = requestSnaps.get(printRequestId);
      if (!requestSnap?.exists) {
        continue;
      }
      const requestData = requestSnap.data() ?? {};
      const status = typeof requestData.status === "string" ? requestData.status : "draft";
      if (status !== "editing") {
        parkedRestoreByRequestId.set(printRequestId, null);
        continue;
      }
      const parksDraftPrintRequestId =
        typeof requestData.parksDraftPrintRequestId === "string"
          ? requestData.parksDraftPrintRequestId
          : undefined;
      parkedRestoreByRequestId.set(
        printRequestId,
        await readParkedDraftForRestoreInTransaction(
          transaction,
          requestSnap.ref,
          parksDraftPrintRequestId,
        ),
      );
    }

    const eligibleById = new Map(eligibleAllocations.map((allocation) => [allocation.id, allocation]));
    const sourceAllocationById = new Map(sourceAllocations.map((allocation) => [allocation.id, allocation]));

    for (const allocationDoc of sourceAllocationsSnap.docs) {
      const eligible = eligibleById.get(allocationDoc.id);
      if (!eligible) {
        continue;
      }
      transaction.update(allocationDoc.ref, {
        status: "canceled",
        canceledAt: FieldValue.serverTimestamp(),
        canceledBy: input.actorId,
        updatedBy: input.actorId,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    for (const eligible of eligibleAllocations) {
      const sourceAllocation = sourceAllocationById.get(eligible.id);
      if (!sourceAllocation) {
        continue;
      }
      const newAllocationRef = adminDb.collection("showAllocations").doc();
      transaction.set(
        newAllocationRef,
        cloneAllocationForRequeue({
          sourceAllocation,
          targetUpcomingShowId: targetShowId,
          actorId: input.actorId,
        }),
      );
    }

    const postSourceAllocations = sourceAllocations.map((allocation) => {
      if (eligibleById.has(allocation.id)) {
        return { ...allocation, status: "canceled" };
      }
      return allocation;
    });
    const sourceAllocatedQuantity = computeShowAllocatedQuantityFromAllocations(
      postSourceAllocations,
      input.upcomingShowId,
    );

    const postTargetAllocations = [
      ...targetAllocationsSnap.docs.map((doc) => {
        const data = doc.data();
        return {
          upcomingShowId: targetShowId,
          status: typeof data.status === "string" ? data.status : "canceled",
          allocatedQuantity:
            typeof data.allocatedQuantity === "number" ? data.allocatedQuantity : 0,
        };
      }),
      ...eligibleAllocations.map((allocation) => ({
        upcomingShowId: targetShowId,
        status: "pending",
        allocatedQuantity: allocation.allocatedQuantity,
      })),
    ];
    const targetAllocatedQuantity = computeShowAllocatedQuantityFromAllocations(
      postTargetAllocations,
      targetShowId,
    );

    transaction.update(sourceShowRef, {
      ...buildShowCompletionPatch({
        actorId: input.actorId,
        resolutionKind: "unfulfilled_requeue",
        includeFinishTimerFields: latestSourceStatus === "printing",
      }),
      allocatedQuantity: sourceAllocatedQuantity,
    });
    transaction.update(targetShowRef, {
      allocatedQuantity: targetAllocatedQuantity,
      updatedBy: input.actorId,
      updatedAt: FieldValue.serverTimestamp(),
    });

    for (const printRequestId of affectedRequestIdSet) {
      const requestSnap = requestSnaps.get(printRequestId);
      if (!requestSnap?.exists) {
        continue;
      }
      const requestData = requestSnap.data() ?? {};
      const status = typeof requestData.status === "string" ? requestData.status : "draft";
      const requestPatch: Record<string, unknown> = {
        ...clearNeedsStaffRequeueAdminPatch(),
        updatedBy: input.actorId,
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (status === "draft" || status === "editing") {
        requestPatch.status = "active";

        // Restore parked draft when transitioning editing → active (writes only).
        if (status === "editing") {
          applyRestoreParkedDraftWritesInTransaction(transaction, {
            editingRequestRef: requestSnap.ref,
            restoreRead: parkedRestoreByRequestId.get(printRequestId) ?? null,
            actorId: input.actorId,
            clearEditingParkingFields: false,
          });
          requestPatch.parksDraftPrintRequestId = FieldValue.delete();
        }
      }
      transaction.update(requestSnap.ref, requestPatch);
    }

    affectedPrintRequestIds = [...affectedRequestIdSet];
    transaction.set(idempotencyRef, {
      upcomingShowId: input.upcomingShowId,
      action: "requeue_unfulfilled",
      targetUpcomingShowId: targetShowId,
      appliedAt: FieldValue.serverTimestamp(),
      appliedBy: input.actorId,
      affectedPrintRequestIds,
    });
  });

  if (affectedPrintRequestIds.length === 0) {
    const latest = await loadRecoveryShow(input.upcomingShowId);
    if (latest && isTerminalWhatnotProductionStatus(latest.productionStatus)) {
      return {
        outcome: "already_terminal",
        action: "requeue_unfulfilled",
        upcomingShowId: input.upcomingShowId,
        message: "Show is already in a terminal production state.",
        affectedPrintRequestIds: [],
      };
    }
  }

  for (const printRequestId of affectedPrintRequestIds) {
    await recomputeAndPersistQueueTab(printRequestId);
  }

  return {
    outcome: "applied",
    action: "requeue_unfulfilled",
    upcomingShowId: input.upcomingShowId,
    message: "Show production recovery applied.",
    affectedPrintRequestIds,
    productionResolutionKind: "unfulfilled_requeue",
  };
}
