import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import { buildShowAllocationSourceFields } from "../../packages/shared/src/utils/showAllocationSourceFields";
import { canAllocateOriginToShowSource, isStaffGangSheetSource } from "../../packages/shared/src/utils/staffGangSheet";
import {
  formatShowAllocationBlockedMessage,
  getShowAllocationBlockReason,
} from "../../packages/shared/src/utils/showAllocationEligibility";
import { getPrintRequestAllocationBlockReason } from "../../packages/shared/src/utils/printRequestConversion";
import { computeShowAllocatedQuantityFromAllocations } from "../../packages/shared/src/utils/showProductionRecovery";
import type { ShowProductionStatus } from "../../packages/shared/src/types/upcomingShow/upcomingShow.enums";

import { assertStaffCaller, loadCallerProfile } from "./lib/caller";
import { adminDb } from "./lib/admin";
import { failedPrecondition, internal, invalidArgument, unauthenticated } from "./lib/errors";
import { withoutUndefinedFields } from "./lib/firestoreDocument";
import { recomputeAndPersistQueueTab } from "./lib/printRequestQueueTab";

export interface AllocateStudioPrintRequestToShowLeg {
  upcomingShowId: string;
  quantitiesByItemId: Record<string, number>;
}

export interface AllocateStudioPrintRequestToShowRequest {
  printRequestId: string;
  legs: AllocateStudioPrintRequestToShowLeg[];
}

export interface AllocateStudioPrintRequestToShowResponse {
  printRequestId: string;
  allocationIds: string[];
  totalAllocatedQuantity: number;
  remainingUnallocatedQuantity: number;
  isFullyQueued: boolean;
  repairedExistingAllocationState: boolean;
}

interface ItemLine {
  id: string;
  quantity: number;
  sourceType: "catalog_design" | "customer_upload";
  designId?: string;
  customerUploadId?: string;
  titleSnapshot?: string;
  printWidthInches?: number;
  printHeightInches?: number;
  sizeLabel?: string;
}

interface ActiveAllocationLine {
  id: string;
  upcomingShowId: string;
  printRequestItemId: string;
  allocatedQuantity: number;
  status: string;
}

function mapHttpsError(error: unknown): never {
  if (error instanceof HttpsError) {
    throw error;
  }
  if (error instanceof Error) {
    throw invalidArgument(error.message);
  }
  throw internal("Unable to add this request to the show right now.");
}

export function parseAllocateStudioPrintRequestToShowRequest(
  data: unknown,
): AllocateStudioPrintRequestToShowRequest {
  if (!data || typeof data !== "object") {
    throw invalidArgument("printRequestId and at least one show allocation are required.");
  }

  const input = data as Record<string, unknown>;
  const printRequestId = typeof input.printRequestId === "string" ? input.printRequestId.trim() : "";
  const rawLegs = Array.isArray(input.legs) ? input.legs : [];
  if (!printRequestId || rawLegs.length === 0 || rawLegs.length > 20) {
    throw invalidArgument("printRequestId and at least one show allocation are required.");
  }

  const legs = rawLegs.map((rawLeg) => {
    if (!rawLeg || typeof rawLeg !== "object") {
      throw invalidArgument("Each show allocation must include a show and quantities.");
    }
    const leg = rawLeg as Record<string, unknown>;
    const upcomingShowId = typeof leg.upcomingShowId === "string" ? leg.upcomingShowId.trim() : "";
    const rawQuantities = leg.quantitiesByItemId;
    if (!upcomingShowId || !rawQuantities || typeof rawQuantities !== "object") {
      throw invalidArgument("Each show allocation must include a show and quantities.");
    }

    const quantitiesByItemId: Record<string, number> = {};
    for (const [itemId, rawQuantity] of Object.entries(rawQuantities as Record<string, unknown>)) {
      if (!itemId || typeof rawQuantity !== "number" || !Number.isInteger(rawQuantity) || rawQuantity <= 0) {
        throw invalidArgument("Show allocation quantities must be positive whole numbers.");
      }
      quantitiesByItemId[itemId] = rawQuantity;
    }

    if (Object.keys(quantitiesByItemId).length === 0) {
      throw invalidArgument("Each show allocation must include at least one item quantity.");
    }

    return { upcomingShowId, quantitiesByItemId };
  });

  return { printRequestId, legs };
}

function readItemLines(
  snapshot: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>,
): ItemLine[] {
  return snapshot.docs.map((itemDoc) => {
    const data = itemDoc.data();
    const quantity = typeof data.quantity === "number" ? data.quantity : 0;
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw invalidArgument("Print request item data is incomplete.");
    }

    const sourceType = data.sourceType === "customer_upload" ? "customer_upload" : "catalog_design";
    const designId = typeof data.designId === "string" ? data.designId.trim() : undefined;
    const customerUploadId = typeof data.customerUploadId === "string" ? data.customerUploadId.trim() : undefined;
    if (sourceType === "catalog_design" && !designId) {
      throw invalidArgument("Catalog print request item data is incomplete.");
    }
    if (sourceType === "customer_upload" && !customerUploadId) {
      throw invalidArgument("Uploaded print request item data is incomplete.");
    }

    return {
      id: itemDoc.id,
      quantity,
      sourceType,
      ...(designId ? { designId } : {}),
      ...(customerUploadId ? { customerUploadId } : {}),
      ...(typeof data.titleSnapshot === "string" ? { titleSnapshot: data.titleSnapshot.trim() } : {}),
      ...(typeof data.printWidthInches === "number" ? { printWidthInches: data.printWidthInches } : {}),
      ...(typeof data.printHeightInches === "number" ? { printHeightInches: data.printHeightInches } : {}),
      ...(typeof data.sizeLabel === "string" ? { sizeLabel: data.sizeLabel } : {}),
    };
  });
}

function readActiveAllocations(
  snapshot: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>,
): ActiveAllocationLine[] {
  return snapshot.docs.flatMap((allocationDoc) => {
    const data = allocationDoc.data();
    const allocatedQuantity = typeof data.allocatedQuantity === "number" ? data.allocatedQuantity : 0;
    const itemId = typeof data.printRequestItemId === "string" ? data.printRequestItemId : "";
    const upcomingShowId = typeof data.upcomingShowId === "string" ? data.upcomingShowId : "";
    const status = typeof data.status === "string" ? data.status : "canceled";
    if (!itemId || !upcomingShowId || allocatedQuantity <= 0 || status === "canceled") {
      return [];
    }
    return [{ id: allocationDoc.id, upcomingShowId, printRequestItemId: itemId, allocatedQuantity, status }];
  });
}

function sumByItem(lines: readonly ActiveAllocationLine[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const line of lines) {
    totals.set(line.printRequestItemId, (totals.get(line.printRequestItemId) ?? 0) + line.allocatedQuantity);
  }
  return totals;
}

export function validateStudioAllocationLegTotals(
  legs: readonly AllocateStudioPrintRequestToShowLeg[],
  itemById: ReadonlyMap<string, ItemLine>,
  remainingByItemId: ReadonlyMap<string, number>,
): Map<string, number> {
  const requestedByItemId = new Map<string, number>();
  for (const leg of legs) {
    for (const [itemId, quantity] of Object.entries(leg.quantitiesByItemId)) {
      const item = itemById.get(itemId);
      if (!item) {
        throw invalidArgument("Show allocation references an item that is not on this request.");
      }
      const next = (requestedByItemId.get(itemId) ?? 0) + quantity;
      if (next > (remainingByItemId.get(itemId) ?? 0)) {
        throw failedPrecondition("The requested allocation exceeds the remaining print quantity.");
      }
      requestedByItemId.set(itemId, next);
    }
  }

  for (const [itemId, remaining] of remainingByItemId.entries()) {
    if ((requestedByItemId.get(itemId) ?? 0) !== remaining) {
      throw failedPrecondition("Add all remaining prints to shows before saving this allocation plan.");
    }
  }
  return requestedByItemId;
}

export const allocateStudioPrintRequestToShow = onCall(
  async (request): Promise<AllocateStudioPrintRequestToShowResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      const caller = await loadCallerProfile(request.auth.uid);
      assertStaffCaller(caller);
      const payload = parseAllocateStudioPrintRequestToShowRequest(request.data);
      const requestRef = adminDb.collection("printRequests").doc(payload.printRequestId);
      const now = new Date();

      const result = await adminDb.runTransaction(async (transaction) => {
        const [requestSnap, itemsSnap, requestAllocationsSnap] = await Promise.all([
          transaction.get(requestRef),
          transaction.get(adminDb.collection("printRequestItems").where("printRequestId", "==", payload.printRequestId)),
          transaction.get(adminDb.collection("showAllocations").where("printRequestId", "==", payload.printRequestId)),
        ]);

        if (!requestSnap.exists) {
          throw invalidArgument("Print request not found.");
        }

        const requestData = requestSnap.data() ?? {};
        const status = typeof requestData.status === "string" ? requestData.status : "draft";
        const allocationBlockReason = getPrintRequestAllocationBlockReason({
          status,
          closureKind: requestData.closureKind,
        });
        if (allocationBlockReason) {
          throw failedPrecondition(allocationBlockReason);
        }

        const items = readItemLines(itemsSnap);
        if (items.length === 0) {
          throw failedPrecondition("Add at least one design before adding this request to a show.");
        }

        const activeAllocations = readActiveAllocations(requestAllocationsSnap);
        if (activeAllocations.some((allocation) => ["in_progress", "printed", "done"].includes(allocation.status))) {
          throw failedPrecondition("This request has production work in progress and cannot be re-added.");
        }
        const allocatedByItemId = sumByItem(activeAllocations);
        const itemById = new Map(items.map((item) => [item.id, item] as const));
        const remainingByItemId = new Map(
          items.map((item) => [item.id, Math.max(0, item.quantity - (allocatedByItemId.get(item.id) ?? 0))] as const),
        );
        const remainingTotal = [...remainingByItemId.values()].reduce((sum, quantity) => sum + quantity, 0);

        // A retry after a committed transaction, or a DEV row stranded by the former client loop,
        // is a safe repair: no new allocation is fabricated when every item is already covered.
        const repairedExistingAllocationState = status === "editing" && activeAllocations.length > 0;
        if (remainingTotal === 0) {
          if (status !== "active" || repairedExistingAllocationState || requestData.parksDraftPrintRequestId) {
            transaction.update(requestRef, {
              status: "active",
              parksDraftPrintRequestId: FieldValue.delete(),
              parkedByEditingRequestId: FieldValue.delete(),
              parkedAt: FieldValue.delete(),
              needsStaffRequeueAt: FieldValue.delete(),
              needsStaffRequeueSourceShowId: FieldValue.delete(),
              needsStaffRequeueSourceShowTitleSnapshot: FieldValue.delete(),
              needsStaffRequeueReleasedQuantity: FieldValue.delete(),
              updatedBy: caller.id,
              updatedAt: FieldValue.serverTimestamp(),
            });
          }
          return {
            printRequestId: payload.printRequestId,
            allocationIds: [],
            totalAllocatedQuantity: 0,
            remainingUnallocatedQuantity: 0,
            isFullyQueued: true,
            repairedExistingAllocationState,
          };
        }

        const requestedByItemId = validateStudioAllocationLegTotals(payload.legs, itemById, remainingByItemId);
        const showIds = [...new Set(payload.legs.map((leg) => leg.upcomingShowId))];
        const showRefs = new Map(showIds.map((showId) => [showId, adminDb.collection("upcomingShows").doc(showId)] as const));
        const showSnaps = await Promise.all([...showRefs.values()].map((showRef) => transaction.get(showRef)));
        const showById = new Map(showSnaps.map((showSnap) => [showSnap.id, showSnap] as const));
        const showAllocationSnaps = await Promise.all(
          showIds.map((showId) =>
            transaction.get(adminDb.collection("showAllocations").where("upcomingShowId", "==", showId)),
          ),
        );
        const allocationsByShowId = new Map(showIds.map((showId, index) => [showId, showAllocationSnaps[index]!] as const));
        const timestamp = FieldValue.serverTimestamp();
        const requestName = typeof requestData.name === "string" && requestData.name.trim() ? requestData.name.trim() : "Print request";
        const requestOrigin = typeof requestData.requestOrigin === "string" ? requestData.requestOrigin : undefined;
        const isInternal = requestData.isInternal === true;
        const customerId = typeof requestData.customerId === "string" ? requestData.customerId : undefined;
        const allocationIds: string[] = [];
        const addedByShowId = new Map<string, number>();
        const nextAllocatedByShowId = new Map<string, number>();

        for (const showId of showIds) {
          const showSnap = showById.get(showId);
          if (!showSnap?.exists) {
            throw invalidArgument("Show not found.");
          }
          const showData = showSnap.data() ?? {};
          if (showData.isArchived === true) {
            throw failedPrecondition("This show is no longer available.");
          }
          if (!canAllocateOriginToShowSource({ source: showData.source, requestOrigin, isInternal })) {
            throw failedPrecondition("This request type cannot be added to the selected show.");
          }
          if (isStaffGangSheetSource(showData.source) && showData.productionStatus === "completed") {
            throw failedPrecondition("This Internal Gangsheet is no longer accepting requests.");
          }

          const requestedOnShow = payload.legs
            .filter((leg) => leg.upcomingShowId === showId)
            .reduce((sum, leg) => sum + Object.values(leg.quantitiesByItemId).reduce((legSum, quantity) => legSum + quantity, 0), 0);
          const showCapacity = typeof showData.maxTotalQuantity === "number" ? showData.maxTotalQuantity : undefined;
          const currentAllocated = computeShowAllocatedQuantityFromAllocations(
            (allocationsByShowId.get(showId)?.docs ?? []).map((allocationDoc) => {
              const data = allocationDoc.data();
              return {
                id: allocationDoc.id,
                upcomingShowId: showId,
                printRequestId: typeof data.printRequestId === "string" ? data.printRequestId : undefined,
                status: typeof data.status === "string" ? data.status : "canceled",
                allocatedQuantity: typeof data.allocatedQuantity === "number" ? data.allocatedQuantity : 0,
              };
            }),
            showId,
          );
          const blockReason = getShowAllocationBlockReason(
            {
              scheduledStartAt: showData.scheduledStartAt,
              productionStatus: showData.productionStatus as ShowProductionStatus | undefined,
              maxTotalQuantity: showCapacity,
              allocatedQuantity: currentAllocated,
            },
            now,
          );
          if (blockReason) {
            throw failedPrecondition(formatShowAllocationBlockedMessage(blockReason));
          }
          if (showCapacity !== undefined && currentAllocated + requestedOnShow > showCapacity) {
            throw failedPrecondition("This show does not have enough remaining capacity.");
          }
          addedByShowId.set(showId, requestedOnShow);
          nextAllocatedByShowId.set(showId, currentAllocated + requestedOnShow);
        }

        for (const leg of payload.legs) {
          for (const [itemId, quantity] of Object.entries(leg.quantitiesByItemId)) {
            const item = itemById.get(itemId)!;
            const allocationRef = adminDb.collection("showAllocations").doc();
            allocationIds.push(allocationRef.id);
            const sourceFields = buildShowAllocationSourceFields({
              item: {
                sourceType: item.sourceType === "customer_upload" ? "customer_upload" : undefined,
                designId: item.designId,
                customerUploadId: item.customerUploadId,
                titleSnapshot: item.titleSnapshot,
                quantity: item.quantity,
                printWidthInches: item.printWidthInches,
                printHeightInches: item.printHeightInches,
                sizeLabel: item.sizeLabel,
              },
            });
            transaction.set(
              allocationRef,
              withoutUndefinedFields({
                upcomingShowId: leg.upcomingShowId,
                printRequestId: payload.printRequestId,
                printRequestItemId: item.id,
                ...sourceFields,
                ...(customerId ? { customerId } : {}),
                requestNameSnapshot: requestName,
                requestOriginSnapshot: requestOrigin,
                allocatedQuantity: quantity,
                sourceItemQuantitySnapshot: item.quantity,
                printWidthInches: item.printWidthInches,
                printHeightInches: item.printHeightInches,
                sizeLabel: item.sizeLabel,
                status: "pending",
                addedBy: caller.id,
                updatedBy: caller.id,
                createdAt: timestamp,
                updatedAt: timestamp,
              }),
            );
          }
        }

        for (const [showId, quantity] of addedByShowId.entries()) {
          const showSnap = showById.get(showId)!;
          transaction.update(showSnap.ref, {
            allocatedQuantity: nextAllocatedByShowId.get(showId) ?? quantity,
            updatedBy: caller.id,
            updatedAt: timestamp,
          });
        }

        transaction.update(requestRef, {
          status: "active",
          itemCount: items.length,
          parksDraftPrintRequestId: FieldValue.delete(),
          parkedByEditingRequestId: FieldValue.delete(),
          parkedAt: FieldValue.delete(),
          needsStaffRequeueAt: FieldValue.delete(),
          needsStaffRequeueSourceShowId: FieldValue.delete(),
          needsStaffRequeueSourceShowTitleSnapshot: FieldValue.delete(),
          needsStaffRequeueReleasedQuantity: FieldValue.delete(),
          updatedBy: caller.id,
          updatedAt: timestamp,
        });

        return {
          printRequestId: payload.printRequestId,
          allocationIds,
          totalAllocatedQuantity: [...requestedByItemId.values()].reduce((sum, quantity) => sum + quantity, 0),
          remainingUnallocatedQuantity: 0,
          isFullyQueued: true,
          repairedExistingAllocationState,
        };
      });

      await recomputeAndPersistQueueTab(payload.printRequestId);
      return result;
    } catch (error) {
      mapHttpsError(error);
    }
  },
);
