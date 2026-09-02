import { FieldValue, type DocumentSnapshot, type Transaction } from "firebase-admin/firestore";

import type {
  ApplyShowQueueMoveRequest,
  ApplyShowQueueMoveResponse,
  PreviewShowQueueMoveRequest,
  PreviewShowQueueMoveResponse,
  ShowQueueMoveScope,
} from "../../../packages/shared/src/types/showQueueMove/showQueueMove.types";
import {
  assembleShowQueueMovePreview,
  collectMovableShowQueueMoveAllocations,
  collectNonMovableActiveShowQueueMoveAllocations,
  recomputeShowAllocatedQuantityAfterMove,
  verifyShowQueueMovePreviewChecksum,
  type ShowQueueMoveAllocationSnapshot,
  type ShowQueueMoveShowInput,
} from "../../../packages/shared/src/utils/showQueueMove";
import { withoutUndefinedFields } from "./firestoreDocument";
import { adminDb } from "./admin";
import { recomputeAndPersistQueueTab } from "./printRequestQueueTab";
import { failedPrecondition, invalidArgument } from "./errors";

const MOVE_APPLICATIONS_COLLECTION = "showQueueMoveApplications";

export interface LoadedMoveShow {
  id: string;
  source: string;
  title?: string;
  productionStatus: string;
  scheduledStartAt?: { toDate: () => Date; toMillis?: () => number };
  allocatedQuantity: number;
  maxTotalQuantity?: number;
}

export interface MoveAllocationFull extends ShowQueueMoveAllocationSnapshot {
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

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function toShowInput(show: LoadedMoveShow): ShowQueueMoveShowInput {
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

function mapAllocationDoc(
  docId: string,
  data: Record<string, unknown>,
  fallbackShowId: string,
): MoveAllocationFull {
  return {
    id: docId,
    upcomingShowId: typeof data.upcomingShowId === "string" ? data.upcomingShowId : fallbackShowId,
    printRequestId: typeof data.printRequestId === "string" ? data.printRequestId : "",
    printRequestItemId: typeof data.printRequestItemId === "string" ? data.printRequestItemId : "",
    designId: readOptionalString(data.designId),
    sourceType: readOptionalString(data.sourceType),
    customerUploadId: readOptionalString(data.customerUploadId),
    customerId: readOptionalString(data.customerId),
    requestNameSnapshot: readOptionalString(data.requestNameSnapshot),
    requestOriginSnapshot: readOptionalString(data.requestOriginSnapshot),
    designTitleSnapshot: readOptionalString(data.designTitleSnapshot),
    allocatedQuantity: typeof data.allocatedQuantity === "number" ? data.allocatedQuantity : 0,
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
}

export async function loadMoveShow(showId: string): Promise<LoadedMoveShow | null> {
  const snap = await adminDb.collection("upcomingShows").doc(showId).get();
  if (!snap.exists) {
    return null;
  }
  const data = snap.data() ?? {};
  return {
    id: snap.id,
    source: typeof data.source === "string" ? data.source : "whatnot",
    title: typeof data.title === "string" ? data.title : undefined,
    productionStatus: typeof data.productionStatus === "string" ? data.productionStatus : "open",
    scheduledStartAt: data.scheduledStartAt as LoadedMoveShow["scheduledStartAt"],
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

export async function loadFullAllocationsForShow(showId: string): Promise<MoveAllocationFull[]> {
  const snap = await adminDb.collection("showAllocations").where("upcomingShowId", "==", showId).get();
  return snap.docs.map((doc) => mapAllocationDoc(doc.id, doc.data() as Record<string, unknown>, showId));
}

async function loadAllocationsForPrintRequests(
  printRequestIds: readonly string[],
): Promise<MoveAllocationFull[]> {
  const uniqueIds = [...new Set(printRequestIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return [];
  }
  const results: MoveAllocationFull[] = [];
  for (let index = 0; index < uniqueIds.length; index += 10) {
    const chunk = uniqueIds.slice(index, index + 10);
    const snap = await adminDb
      .collection("showAllocations")
      .where("printRequestId", "in", chunk)
      .get();
    for (const doc of snap.docs) {
      results.push(mapAllocationDoc(doc.id, doc.data() as Record<string, unknown>, ""));
    }
  }
  return results;
}

function parseScope(value: unknown): ShowQueueMoveScope {
  if (value === "print_request" || value === "whole_show") {
    return value;
  }
  throw invalidArgument("Select a valid move scope.");
}

export function parseShowQueueMovePreviewRequest(data: unknown): PreviewShowQueueMoveRequest {
  if (!data || typeof data !== "object") {
    throw invalidArgument("Request data is required.");
  }
  const record = data as Record<string, unknown>;
  const sourceShowId = typeof record.sourceShowId === "string" ? record.sourceShowId.trim() : "";
  const destinationShowId =
    typeof record.destinationShowId === "string" ? record.destinationShowId.trim() : "";
  if (!sourceShowId) {
    throw invalidArgument("Source show is required.");
  }
  if (!destinationShowId) {
    throw invalidArgument("Destination show is required.");
  }
  const scope = parseScope(record.scope);
  const printRequestId =
    typeof record.printRequestId === "string" ? record.printRequestId.trim() : undefined;
  if (scope === "print_request" && !printRequestId) {
    throw invalidArgument("A print request is required.");
  }
  return {
    scope,
    sourceShowId,
    destinationShowId,
    ...(printRequestId ? { printRequestId } : {}),
  };
}

export function parseShowQueueMoveApplyRequest(data: unknown): ApplyShowQueueMoveRequest {
  const preview = parseShowQueueMovePreviewRequest(data);
  if (!data || typeof data !== "object") {
    throw invalidArgument("Request data is required.");
  }
  const previewChecksum =
    "previewChecksum" in data && typeof data.previewChecksum === "string"
      ? data.previewChecksum.trim()
      : "";
  if (!previewChecksum) {
    throw invalidArgument("Preview checksum is required.");
  }
  return { ...preview, previewChecksum };
}

function cloneAllocationForMove(input: {
  sourceAllocation: MoveAllocationFull;
  destinationShowId: string;
  actorId: string;
}): Record<string, unknown> {
  const timestamp = FieldValue.serverTimestamp();
  return withoutUndefinedFields({
    upcomingShowId: input.destinationShowId,
    printRequestId: input.sourceAllocation.printRequestId,
    printRequestItemId: input.sourceAllocation.printRequestItemId,
    designId: input.sourceAllocation.designId,
    sourceType: input.sourceAllocation.sourceType,
    customerUploadId: input.sourceAllocation.customerUploadId,
    customerId: input.sourceAllocation.customerId,
    requestNameSnapshot:
      input.sourceAllocation.requestNameSnapshot?.trim() || input.sourceAllocation.printRequestId,
    requestOriginSnapshot: input.sourceAllocation.requestOriginSnapshot,
    designTitleSnapshot: input.sourceAllocation.designTitleSnapshot,
    allocatedQuantity: input.sourceAllocation.allocatedQuantity,
    sourceItemQuantitySnapshot: input.sourceAllocation.sourceItemQuantitySnapshot,
    printWidthInches: input.sourceAllocation.printWidthInches,
    printHeightInches: input.sourceAllocation.printHeightInches,
    sizeLabel: input.sourceAllocation.sizeLabel,
    notes: input.sourceAllocation.notes,
    status: "pending",
    movedFromAllocationId: input.sourceAllocation.id,
    addedBy: input.actorId,
    updatedBy: input.actorId,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

async function loadRequestsInTransaction(
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

export async function buildShowQueueMovePreview(
  request: PreviewShowQueueMoveRequest,
  now: Date = new Date(),
): Promise<PreviewShowQueueMoveResponse> {
  const sourceShow = await loadMoveShow(request.sourceShowId);
  if (!sourceShow) {
    throw invalidArgument("Source show could not be found.");
  }
  const destinationShow = await loadMoveShow(request.destinationShowId);
  if (!destinationShow) {
    throw invalidArgument("Destination show could not be found.");
  }

  const sourceAllocations = await loadFullAllocationsForShow(request.sourceShowId);
  const destinationAllocations = await loadFullAllocationsForShow(request.destinationShowId);
  const liveDestinationAllocated = destinationAllocations
    .filter((allocation) => allocation.status !== "canceled")
    .reduce((sum, allocation) => sum + allocation.allocatedQuantity, 0);
  destinationShow.allocatedQuantity = liveDestinationAllocated;

  const printRequestId =
    request.scope === "print_request" ? request.printRequestId?.trim() : undefined;
  const movableAllocations = collectMovableShowQueueMoveAllocations(
    sourceAllocations,
    request.sourceShowId,
    printRequestId,
  );
  const nonMovableAllocations = collectNonMovableActiveShowQueueMoveAllocations(
    sourceAllocations,
    request.sourceShowId,
    printRequestId,
  );

  const affectedRequestIds = [
    ...new Set([
      ...movableAllocations.map((allocation) => allocation.printRequestId),
      ...nonMovableAllocations.map((allocation) => allocation.printRequestId),
    ]),
  ];
  const allAllocationsForRequests = await loadAllocationsForPrintRequests(affectedRequestIds);
  // Ensure destination rows for already-on-destination detection are present even if chunk query missed edge cases.
  for (const allocation of destinationAllocations) {
    if (!allAllocationsForRequests.some((row) => row.id === allocation.id)) {
      allAllocationsForRequests.push(allocation);
    }
  }

  return assembleShowQueueMovePreview({
    scope: request.scope,
    sourceShow: toShowInput(sourceShow),
    destinationShow: toShowInput(destinationShow),
    movableAllocations,
    nonMovableAllocations,
    allAllocationsForRequests,
    printRequestId,
    now,
  });
}

export async function applyShowQueueMove(input: {
  request: ApplyShowQueueMoveRequest;
  actorId: string;
}): Promise<ApplyShowQueueMoveResponse> {
  const { request, actorId } = input;
  const previewChecksum = request.previewChecksum.trim();
  const idempotencyRef = adminDb.collection(MOVE_APPLICATIONS_COLLECTION).doc(previewChecksum);

  const existingApplication = await idempotencyRef.get();
  if (existingApplication.exists) {
    const existingData = existingApplication.data() ?? {};
    return {
      outcome: "already_applied",
      scope: request.scope,
      sourceShowId: request.sourceShowId,
      destinationShowId: request.destinationShowId,
      printRequestId: request.printRequestId,
      movedAllocationCount:
        typeof existingData.movedAllocationCount === "number"
          ? existingData.movedAllocationCount
          : 0,
      totalMoveQuantity:
        typeof existingData.totalMoveQuantity === "number" ? existingData.totalMoveQuantity : 0,
      affectedPrintRequestIds: Array.isArray(existingData.affectedPrintRequestIds)
        ? existingData.affectedPrintRequestIds.filter(
            (value): value is string => typeof value === "string",
          )
        : [],
      sourceAllocatedQuantity:
        typeof existingData.sourceAllocatedQuantity === "number"
          ? existingData.sourceAllocatedQuantity
          : 0,
      destinationAllocatedQuantity:
        typeof existingData.destinationAllocatedQuantity === "number"
          ? existingData.destinationAllocatedQuantity
          : 0,
      message: "Move already applied.",
    };
  }

  const sourceShowRef = adminDb.collection("upcomingShows").doc(request.sourceShowId);
  const destinationShowRef = adminDb.collection("upcomingShows").doc(request.destinationShowId);

  const outcome: { current: ApplyShowQueueMoveResponse | null } = { current: null };

  await adminDb.runTransaction(async (transaction) => {
    const [
      idempotencySnap,
      latestSourceShowSnap,
      latestDestinationShowSnap,
      sourceAllocationsSnap,
      destinationAllocationsSnap,
    ] = await Promise.all([
      transaction.get(idempotencyRef),
      transaction.get(sourceShowRef),
      transaction.get(destinationShowRef),
      transaction.get(
        adminDb.collection("showAllocations").where("upcomingShowId", "==", request.sourceShowId),
      ),
      transaction.get(
        adminDb
          .collection("showAllocations")
          .where("upcomingShowId", "==", request.destinationShowId),
      ),
    ]);

    if (idempotencySnap.exists) {
      const existingData = idempotencySnap.data() ?? {};
      outcome.current = {
        outcome: "already_applied",
        scope: request.scope,
        sourceShowId: request.sourceShowId,
        destinationShowId: request.destinationShowId,
        printRequestId: request.printRequestId,
        movedAllocationCount:
          typeof existingData.movedAllocationCount === "number"
            ? existingData.movedAllocationCount
            : 0,
        totalMoveQuantity:
          typeof existingData.totalMoveQuantity === "number" ? existingData.totalMoveQuantity : 0,
        affectedPrintRequestIds: Array.isArray(existingData.affectedPrintRequestIds)
          ? existingData.affectedPrintRequestIds.filter(
              (value): value is string => typeof value === "string",
            )
          : [],
        sourceAllocatedQuantity:
          typeof existingData.sourceAllocatedQuantity === "number"
            ? existingData.sourceAllocatedQuantity
            : 0,
        destinationAllocatedQuantity:
          typeof existingData.destinationAllocatedQuantity === "number"
            ? existingData.destinationAllocatedQuantity
            : 0,
        message: "Move already applied.",
      };
      return;
    }

    if (!latestSourceShowSnap.exists || !latestDestinationShowSnap.exists) {
      throw invalidArgument("Show not found.");
    }

    const latestSourceShow = latestSourceShowSnap.data() ?? {};
    const latestDestinationShow = latestDestinationShowSnap.data() ?? {};

    const sourceShow: LoadedMoveShow = {
      id: request.sourceShowId,
      source: typeof latestSourceShow.source === "string" ? latestSourceShow.source : "whatnot",
      title: typeof latestSourceShow.title === "string" ? latestSourceShow.title : undefined,
      productionStatus:
        typeof latestSourceShow.productionStatus === "string"
          ? latestSourceShow.productionStatus
          : "open",
      scheduledStartAt: latestSourceShow.scheduledStartAt as LoadedMoveShow["scheduledStartAt"],
      allocatedQuantity:
        typeof latestSourceShow.allocatedQuantity === "number"
          ? latestSourceShow.allocatedQuantity
          : 0,
      maxTotalQuantity:
        typeof latestSourceShow.maxTotalQuantity === "number"
          ? latestSourceShow.maxTotalQuantity
          : undefined,
    };

    const destinationShow: LoadedMoveShow = {
      id: request.destinationShowId,
      source:
        typeof latestDestinationShow.source === "string"
          ? latestDestinationShow.source
          : "whatnot",
      title:
        typeof latestDestinationShow.title === "string" ? latestDestinationShow.title : undefined,
      productionStatus:
        typeof latestDestinationShow.productionStatus === "string"
          ? latestDestinationShow.productionStatus
          : "open",
      scheduledStartAt:
        latestDestinationShow.scheduledStartAt as LoadedMoveShow["scheduledStartAt"],
      allocatedQuantity:
        typeof latestDestinationShow.allocatedQuantity === "number"
          ? latestDestinationShow.allocatedQuantity
          : 0,
      maxTotalQuantity:
        typeof latestDestinationShow.maxTotalQuantity === "number"
          ? latestDestinationShow.maxTotalQuantity
          : undefined,
    };

    // Prefer live allocation sums for destination capacity / checksum (avoid stale denormalized drift).
    const sourceAllocations = sourceAllocationsSnap.docs.map((doc) =>
      mapAllocationDoc(doc.id, doc.data() as Record<string, unknown>, request.sourceShowId),
    );
    const destinationAllocations = destinationAllocationsSnap.docs.map((doc) =>
      mapAllocationDoc(doc.id, doc.data() as Record<string, unknown>, request.destinationShowId),
    );
    const liveDestinationAllocated = destinationAllocations
      .filter((allocation) => allocation.status !== "canceled")
      .reduce((sum, allocation) => sum + allocation.allocatedQuantity, 0);
    destinationShow.allocatedQuantity = liveDestinationAllocated;

    const printRequestId =
      request.scope === "print_request" ? request.printRequestId?.trim() : undefined;
    const movableAllocations = collectMovableShowQueueMoveAllocations(
      sourceAllocations,
      request.sourceShowId,
      printRequestId,
    );
    const nonMovableAllocations = collectNonMovableActiveShowQueueMoveAllocations(
      sourceAllocations,
      request.sourceShowId,
      printRequestId,
    );

    const preview = assembleShowQueueMovePreview({
      scope: request.scope,
      sourceShow: toShowInput(sourceShow),
      destinationShow: toShowInput(destinationShow),
      movableAllocations,
      nonMovableAllocations,
      allAllocationsForRequests: [...sourceAllocations, ...destinationAllocations],
      printRequestId,
    });

    if (!preview.canApply || !preview.previewChecksum) {
      const message = preview.blockers[0]?.message ?? "Move is not available.";
      throw failedPrecondition(message);
    }

    if (
      !verifyShowQueueMovePreviewChecksum(previewChecksum, {
        scope: request.scope,
        sourceShowId: request.sourceShowId,
        destinationShowId: request.destinationShowId,
        printRequestId,
        sourceProductionStatus: sourceShow.productionStatus,
        destinationProductionStatus: destinationShow.productionStatus,
        sourceAllocations: movableAllocations,
        destinationAllocatedQuantity: liveDestinationAllocated,
        maxTotalQuantity: destinationShow.maxTotalQuantity,
      })
    ) {
      throw failedPrecondition("Show state changed. Refresh preview and try again.");
    }

    const affectedRequestIdSet = new Set(
      movableAllocations.map((allocation) => allocation.printRequestId).filter(Boolean),
    );
    const requestSnaps = await loadRequestsInTransaction(transaction, [...affectedRequestIdSet]);
    for (const printRequestIdValue of affectedRequestIdSet) {
      const requestSnap = requestSnaps.get(printRequestIdValue);
      if (!requestSnap?.exists) {
        throw failedPrecondition(`Print request ${printRequestIdValue} no longer exists.`);
      }
    }

    const movableById = new Map(movableAllocations.map((allocation) => [allocation.id, allocation]));
    const sourceById = new Map(sourceAllocations.map((allocation) => [allocation.id, allocation]));

    for (const allocationDoc of sourceAllocationsSnap.docs) {
      if (!movableById.has(allocationDoc.id)) {
        continue;
      }
      transaction.update(allocationDoc.ref, {
        status: "canceled",
        canceledAt: FieldValue.serverTimestamp(),
        canceledBy: actorId,
        updatedBy: actorId,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    for (const movable of movableAllocations) {
      const sourceAllocation = sourceById.get(movable.id);
      if (!sourceAllocation) {
        continue;
      }
      const newRef = adminDb.collection("showAllocations").doc();
      transaction.set(
        newRef,
        cloneAllocationForMove({
          sourceAllocation,
          destinationShowId: request.destinationShowId,
          actorId,
        }),
      );
    }

    const totals = recomputeShowAllocatedQuantityAfterMove({
      sourceShowId: request.sourceShowId,
      destinationShowId: request.destinationShowId,
      sourceAllocations,
      destinationAllocations,
      movedSourceIds: new Set(movableAllocations.map((allocation) => allocation.id)),
      movedQuantities: movableAllocations.map((allocation) => ({
        printRequestId: allocation.printRequestId,
        allocatedQuantity: allocation.allocatedQuantity,
      })),
    });

    transaction.update(sourceShowRef, {
      allocatedQuantity: totals.sourceAllocatedQuantity,
      updatedBy: actorId,
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.update(destinationShowRef, {
      allocatedQuantity: totals.destinationAllocatedQuantity,
      updatedBy: actorId,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const affectedPrintRequestIds = [...affectedRequestIdSet].sort();
    const totalMoveQuantity = movableAllocations.reduce(
      (sum, allocation) => sum + allocation.allocatedQuantity,
      0,
    );

    transaction.set(idempotencyRef, {
      scope: request.scope,
      sourceShowId: request.sourceShowId,
      destinationShowId: request.destinationShowId,
      printRequestId: printRequestId ?? null,
      previewChecksum,
      movedAllocationCount: movableAllocations.length,
      totalMoveQuantity,
      affectedPrintRequestIds,
      sourceAllocatedQuantity: totals.sourceAllocatedQuantity,
      destinationAllocatedQuantity: totals.destinationAllocatedQuantity,
      appliedBy: actorId,
      appliedAt: FieldValue.serverTimestamp(),
    });

    outcome.current = {
      outcome: "applied",
      scope: request.scope,
      sourceShowId: request.sourceShowId,
      destinationShowId: request.destinationShowId,
      printRequestId,
      movedAllocationCount: movableAllocations.length,
      totalMoveQuantity,
      affectedPrintRequestIds,
      sourceAllocatedQuantity: totals.sourceAllocatedQuantity,
      destinationAllocatedQuantity: totals.destinationAllocatedQuantity,
      message: "Move applied.",
    };
  });

  if (!outcome.current) {
    throw failedPrecondition("Unable to apply move.");
  }

  for (const printRequestIdValue of outcome.current.affectedPrintRequestIds) {
    await recomputeAndPersistQueueTab(printRequestIdValue);
  }

  return outcome.current;
}
