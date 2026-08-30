import type {
  ShowProductionRecoveryCapacityBlocker,
  ShowProductionRequeueLine,
  ShowProductionRequeueTargetShow,
  ShowProductionResolutionKind,
} from "../types/showProductionRecovery/showProductionRecovery.types";
import type { PrintRequest } from "../types/printRequest/printRequest.types";
import { isPrintRequestShowTransferDestination } from "./printRequestShowTransfer";
import { assessShowCapacity } from "./showCapacity";
import {
  formatShowAllocationBlockedMessage,
  getShowAllocationBlockReason,
  type ShowAllocationEligibilityInput,
} from "./showAllocationEligibility";
import { isFinishableShowAllocationStatus } from "./showFinishAllocationStatuses";
import { sha256Hex } from "./sha256Hex";

/** Conservative Firestore transaction limit for requeue cancel+create pairs. */
export const SHOW_REQUEUE_MAX_TRANSACTION_ALLOCATIONS = 150;

export interface RequeueAllocationSnapshot {
  id: string;
  upcomingShowId: string;
  printRequestId: string;
  printRequestItemId?: string;
  requestNameSnapshot?: string;
  allocatedQuantity: number;
  status: string;
}

export interface RequeueTargetShowInput extends Omit<ShowAllocationEligibilityInput, "scheduledStartAt"> {
  id: string;
  title?: string | null;
  source?: string | null;
  scheduledStartAt?: { toMillis?: () => number; toDate?: () => Date } | null;
}

export type RequeueTargetValidationResult =
  | { valid: true }
  | { valid: false; code: string; message: string };

export interface RequeueCapacityProjection {
  targetAllocatedQuantity: number;
  totalRequeueQuantity: number;
  projectedAllocatedQuantity: number;
  maxTotalQuantity?: number;
  isOverCapacity: boolean;
  isFull: boolean;
  remainingAfterRequeue?: number;
  capacityBlocker: ShowProductionRecoveryCapacityBlocker | null;
}

export interface ShowProductionRecoveryPreviewChecksumInput {
  upcomingShowId: string;
  action: string;
  targetUpcomingShowId: string;
  sourceProductionStatus: string;
  predictedResolutionKind: ShowProductionResolutionKind;
  sourceAllocations: readonly RequeueAllocationSnapshot[];
  targetShow: {
    id: string;
    maxTotalQuantity?: number;
    allocatedQuantity: number;
  };
}

/**
 * Finishable allocation rows on the source show eligible for Did Not Print requeue.
 * Excludes canceled, printed, done, and rows on other shows.
 */
export function collectRequeueEligibleAllocations(
  allocations: readonly RequeueAllocationSnapshot[],
  sourceShowId: string,
): RequeueAllocationSnapshot[] {
  return allocations.filter(
    (allocation) =>
      allocation.upcomingShowId === sourceShowId &&
      allocation.status !== "canceled" &&
      isFinishableShowAllocationStatus(allocation.status as never),
  );
}

export interface RequeueAllocationQuantitySnapshot {
  upcomingShowId?: string;
  printRequestId?: string;
  allocatedQuantity: number;
  status: string;
}

function sumNonCanceledQuantityOnOtherShows(
  allocations: readonly RequeueAllocationQuantitySnapshot[],
  printRequestId: string,
  sourceShowId: string,
): number {
  let total = 0;
  for (const allocation of allocations) {
    if (allocation.printRequestId !== printRequestId) {
      continue;
    }
    if (allocation.status === "canceled") {
      continue;
    }
    if (allocation.upcomingShowId === sourceShowId) {
      continue;
    }
    total += allocation.allocatedQuantity;
  }
  return total;
}

/** Groups eligible source allocations by print request for preview summaries. */
export function buildRequeueLines(
  eligibleAllocations: readonly RequeueAllocationSnapshot[],
  allAllocations: readonly RequeueAllocationQuantitySnapshot[],
  sourceShowId: string,
): ShowProductionRequeueLine[] {
  const byRequest = new Map<string, RequeueAllocationSnapshot[]>();

  for (const allocation of eligibleAllocations) {
    const existing = byRequest.get(allocation.printRequestId) ?? [];
    existing.push(allocation);
    byRequest.set(allocation.printRequestId, existing);
  }

  const lines: ShowProductionRequeueLine[] = [];

  for (const [printRequestId, rows] of byRequest) {
    const requeueQuantity = rows.reduce((sum, row) => sum + row.allocatedQuantity, 0);
    const requestNameSnapshot =
      rows.find((row) => row.requestNameSnapshot?.trim())?.requestNameSnapshot?.trim() ||
      printRequestId;

    lines.push({
      printRequestId,
      requestNameSnapshot,
      allocationCount: rows.length,
      requeueQuantity,
      otherShowAllocationQuantity: sumNonCanceledQuantityOnOtherShows(
        allAllocations,
        printRequestId,
        sourceShowId,
      ),
    });
  }

  return lines.sort((left, right) =>
    left.requestNameSnapshot.localeCompare(right.requestNameSnapshot),
  );
}

function toShowAllocationEligibilityInput(
  targetShow: RequeueTargetShowInput,
): ShowAllocationEligibilityInput & { source?: string | null } {
  const scheduledStartAt =
    targetShow.scheduledStartAt && typeof targetShow.scheduledStartAt.toDate === "function"
      ? { toDate: targetShow.scheduledStartAt.toDate.bind(targetShow.scheduledStartAt) }
      : null;

  return {
    scheduledStartAt,
    productionStatus: targetShow.productionStatus,
    maxTotalQuantity: targetShow.maxTotalQuantity,
    allocatedQuantity: targetShow.allocatedQuantity,
    source: targetShow.source,
  };
}

export function validateRequeueTargetShow(
  sourceShowId: string,
  targetShowId: string | undefined | null,
  targetShow: RequeueTargetShowInput | null | undefined,
  now: Date = new Date(),
): RequeueTargetValidationResult {
  const trimmedTargetId = typeof targetShowId === "string" ? targetShowId.trim() : "";
  if (!trimmedTargetId) {
    return {
      valid: false,
      code: "target_required",
      message: "Select an upcoming show to move unprinted requests to.",
    };
  }

  if (trimmedTargetId === sourceShowId) {
    return {
      valid: false,
      code: "target_same_as_source",
      message: "The destination show must be different from the missed show.",
    };
  }

  if (!targetShow || targetShow.id !== trimmedTargetId) {
    return {
      valid: false,
      code: "target_not_found",
      message: "The selected destination show could not be found.",
    };
  }

  if (!isPrintRequestShowTransferDestination(toShowAllocationEligibilityInput(targetShow), now)) {
    const blockReason = getShowAllocationBlockReason(toShowAllocationEligibilityInput(targetShow), now);
    return {
      valid: false,
      code: blockReason ?? "target_ineligible",
      message: formatShowAllocationBlockedMessage(blockReason),
    };
  }

  return { valid: true };
}

export function computeRequeueCapacityProjection(input: {
  targetShow: Pick<RequeueTargetShowInput, "maxTotalQuantity" | "allocatedQuantity">;
  totalRequeueQuantity: number;
}): RequeueCapacityProjection {
  const targetAllocatedQuantity = input.targetShow.allocatedQuantity ?? 0;
  const projectedAllocatedQuantity = targetAllocatedQuantity + input.totalRequeueQuantity;
  const capacity = assessShowCapacity({
    maxTotalQuantity: input.targetShow.maxTotalQuantity,
    allocatedQuantity: projectedAllocatedQuantity,
  });

  let capacityBlocker: ShowProductionRecoveryCapacityBlocker | null = null;
  if (input.targetShow.maxTotalQuantity !== undefined && capacity.isOverCapacity) {
    capacityBlocker = {
      code: "capacity_exceeded",
      message: `Moving ${input.totalRequeueQuantity} would exceed the show max (${projectedAllocatedQuantity} of ${input.targetShow.maxTotalQuantity}).`,
      projectedAllocatedQuantity,
      maxTotalQuantity: input.targetShow.maxTotalQuantity,
    };
  }

  return {
    targetAllocatedQuantity,
    totalRequeueQuantity: input.totalRequeueQuantity,
    projectedAllocatedQuantity,
    maxTotalQuantity: input.targetShow.maxTotalQuantity,
    isOverCapacity: capacity.isOverCapacity,
    isFull: capacity.isFull,
    remainingAfterRequeue: capacity.remainingQuantity,
    capacityBlocker,
  };
}

function resolveScheduledStartAtMillis(
  scheduledStartAt: RequeueTargetShowInput["scheduledStartAt"],
): number | null {
  if (!scheduledStartAt) {
    return null;
  }
  if (typeof scheduledStartAt.toMillis === "function") {
    return scheduledStartAt.toMillis();
  }
  if (typeof scheduledStartAt.toDate === "function") {
    return scheduledStartAt.toDate().getTime();
  }
  return null;
}

export function buildShowProductionRequeueTargetShow(
  targetShow: RequeueTargetShowInput,
  totalRequeueQuantity: number,
): ShowProductionRequeueTargetShow {
  const projection = computeRequeueCapacityProjection({
    targetShow,
    totalRequeueQuantity,
  });

  const title =
    typeof targetShow.title === "string" && targetShow.title.trim()
      ? targetShow.title.trim()
      : "Show";

  return {
    id: targetShow.id,
    title,
    scheduledStartAtMillis: resolveScheduledStartAtMillis(targetShow.scheduledStartAt),
    source: typeof targetShow.source === "string" ? targetShow.source : "unknown",
    maxTotalQuantity: targetShow.maxTotalQuantity,
    allocatedQuantity: projection.targetAllocatedQuantity,
    projectedAllocatedQuantity: projection.projectedAllocatedQuantity,
  };
}

function buildChecksumAllocationEntries(
  allocations: readonly RequeueAllocationSnapshot[],
): Array<{ id: string; status: string; allocatedQuantity: number }> {
  return [...allocations]
    .map((allocation) => ({
      id: allocation.id,
      status: allocation.status,
      allocatedQuantity: allocation.allocatedQuantity,
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function buildShowProductionRecoveryPreviewChecksum(
  input: ShowProductionRecoveryPreviewChecksumInput,
): string {
  const payload = {
    upcomingShowId: input.upcomingShowId,
    action: input.action,
    targetUpcomingShowId: input.targetUpcomingShowId,
    sourceProductionStatus: input.sourceProductionStatus,
    predictedResolutionKind: input.predictedResolutionKind,
    sourceAllocations: buildChecksumAllocationEntries(input.sourceAllocations),
    targetShow: {
      id: input.targetShow.id,
      maxTotalQuantity: input.targetShow.maxTotalQuantity ?? null,
      allocatedQuantity: input.targetShow.allocatedQuantity,
    },
  };

  return sha256Hex(JSON.stringify(payload));
}

export function verifyShowProductionRecoveryPreviewChecksum(
  expectedChecksum: string | undefined | null,
  input: ShowProductionRecoveryPreviewChecksumInput,
): boolean {
  const trimmed = typeof expectedChecksum === "string" ? expectedChecksum.trim() : "";
  if (!trimmed) {
    return false;
  }
  return buildShowProductionRecoveryPreviewChecksum(input) === trimmed;
}

/** Blocks requeue/release when a customer request was already converted to an internal request. */
export function isPrintRequestBlockedFromRecovery(
  request: Pick<PrintRequest, "closureKind" | "convertedToInternalRequestId">,
): boolean {
  if (request.closureKind === "converted_to_internal") {
    return true;
  }
  return typeof request.convertedToInternalRequestId === "string" &&
    request.convertedToInternalRequestId.trim().length > 0;
}

export function countFinishableAllocationsOnShow(
  allocations: readonly RequeueAllocationSnapshot[],
  sourceShowId: string,
): number {
  return collectRequeueEligibleAllocations(allocations, sourceShowId).length;
}

export function sumRequeueEligibleQuantity(
  allocations: readonly RequeueAllocationSnapshot[],
  sourceShowId: string,
): number {
  return collectRequeueEligibleAllocations(allocations, sourceShowId).reduce(
    (sum, allocation) => sum + allocation.allocatedQuantity,
    0,
  );
}

export function hasActiveNonFinishableAllocationsOnShow(
  allocations: readonly RequeueAllocationSnapshot[],
  sourceShowId: string,
): boolean {
  return allocations.some(
    (allocation) =>
      allocation.upcomingShowId === sourceShowId &&
      allocation.status !== "canceled" &&
      !isFinishableShowAllocationStatus(allocation.status as never),
  );
}

export function formatRequeueUnfulfilledSuccessMessage(input: {
  sourceShowTitle: string;
  targetShowTitle: string;
  totalQuantity: number;
  affectedPrintRequestIds: readonly string[];
  requeueLines?: readonly Pick<
    ShowProductionRequeueLine,
    "printRequestId" | "requestNameSnapshot" | "requeueQuantity"
  >[];
}): string {
  const sourceTitle = input.sourceShowTitle.trim() || "Source show";
  const targetTitle = input.targetShowTitle.trim() || "Destination show";
  const quantity = Math.max(0, input.totalQuantity);
  const printWord = quantity === 1 ? "print" : "prints";

  const requestSummary =
    input.requeueLines && input.requeueLines.length > 0
      ? input.requeueLines
          .map((line) => {
            const label = line.requestNameSnapshot.trim() || line.printRequestId;
            return `${label} (${line.requeueQuantity})`;
          })
          .join(", ")
      : `${input.affectedPrintRequestIds.length} request${
          input.affectedPrintRequestIds.length === 1 ? "" : "s"
        }`;

  return `"${sourceTitle}" marked Did Not Print · Moved ${quantity} ${printWord} to "${targetTitle}" · ${requestSummary}`;
}
