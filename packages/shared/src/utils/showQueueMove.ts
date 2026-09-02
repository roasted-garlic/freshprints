import type { ShowAllocationStatus } from "../types/showAllocation/showAllocation.enums";
import type { ShowProductionStatus } from "../types/upcomingShow/upcomingShow.enums";
import type {
  PreviewShowQueueMoveResponse,
  ShowQueueMoveBlocker,
  ShowQueueMoveCapacityBlocker,
  ShowQueueMoveLine,
  ShowQueueMoveScope,
  ShowQueueMoveShowSummary,
} from "../types/showQueueMove/showQueueMove.types";
import {
  MOVABLE_SHOW_QUEUE_MOVE_STATUSES,
  SHOW_QUEUE_MOVE_MAX_ALLOCATIONS,
} from "../types/showQueueMove/showQueueMove.types";
import { assessShowCapacity } from "./showCapacity";
import {
  formatShowAllocationBlockedMessage,
  getShowAllocationBlockReason,
  type ShowAllocationEligibilityInput,
} from "./showAllocationEligibility";
import { isPrintRequestWhatnotShow } from "./printRequestShowTransfer";
import { canRemoveRequestFromShow } from "./showQueueEditability";
import { canAllocatePrintRequestToShow, isPastScheduledShow } from "./showScheduleGrouping";
import { sha256Hex } from "./sha256Hex";
import { computeShowAllocatedQuantityFromAllocations } from "./showProductionRecovery";

export { SHOW_QUEUE_MOVE_MAX_ALLOCATIONS, MOVABLE_SHOW_QUEUE_MOVE_STATUSES };

/** Production statuses that must never receive moved work (move-specific; stricter than Add). */
const MOVE_DESTINATION_BLOCKED_PRODUCTION: ReadonlySet<ShowProductionStatus> = new Set([
  "printing",
  "fully_printed",
  "completed",
  "archived",
  "canceled",
  "full",
]);

export interface ShowQueueMoveAllocationSnapshot {
  id: string;
  upcomingShowId: string;
  printRequestId: string;
  printRequestItemId?: string;
  requestNameSnapshot?: string;
  allocatedQuantity: number;
  status: string;
}

export interface ShowQueueMoveShowInput extends ShowAllocationEligibilityInput {
  id: string;
  title?: string | null;
  source?: string | null;
}

export function isMovableShowQueueMoveAllocationStatus(
  status: string | null | undefined,
): status is ShowAllocationStatus {
  return (
    typeof status === "string" &&
    (MOVABLE_SHOW_QUEUE_MOVE_STATUSES as readonly string[]).includes(status)
  );
}

export function collectMovableShowQueueMoveAllocations(
  allocations: readonly ShowQueueMoveAllocationSnapshot[],
  sourceShowId: string,
  printRequestId?: string,
): ShowQueueMoveAllocationSnapshot[] {
  const trimmedPr = printRequestId?.trim() ?? "";
  return allocations.filter((allocation) => {
    if (allocation.upcomingShowId !== sourceShowId) {
      return false;
    }
    if (trimmedPr && allocation.printRequestId !== trimmedPr) {
      return false;
    }
    return isMovableShowQueueMoveAllocationStatus(allocation.status);
  });
}

/**
 * Non-movable active rows in the requested scope (blocks all-or-nothing apply).
 * Canceled rows are ignored (not blockers).
 */
export function collectNonMovableActiveShowQueueMoveAllocations(
  allocations: readonly ShowQueueMoveAllocationSnapshot[],
  sourceShowId: string,
  printRequestId?: string,
): ShowQueueMoveAllocationSnapshot[] {
  const trimmedPr = printRequestId?.trim() ?? "";
  return allocations.filter((allocation) => {
    if (allocation.upcomingShowId !== sourceShowId) {
      return false;
    }
    if (trimmedPr && allocation.printRequestId !== trimmedPr) {
      return false;
    }
    if (allocation.status === "canceled") {
      return false;
    }
    return !isMovableShowQueueMoveAllocationStatus(allocation.status);
  });
}

/** Source must be Whatnot/dev_fixture, not past, and removable (pre-printing). */
export function isShowQueueMoveSourceEligible(
  show: ShowQueueMoveShowInput,
  now: Date = new Date(),
): boolean {
  if (!isPrintRequestWhatnotShow(show)) {
    return false;
  }
  if (isPastScheduledShow(show, now)) {
    return false;
  }
  const status = show.productionStatus;
  if (typeof status === "string" && !canRemoveRequestFromShow(status as ShowProductionStatus)) {
    return false;
  }
  return true;
}

/**
 * Move-specific destination gate: Whatnot, allocatable schedule, and explicitly excludes
 * `printing` (and later/terminal/`full`). Does not alter Add-to-Show helpers.
 */
export function isShowQueueMoveDestination(
  show: ShowQueueMoveShowInput,
  now: Date = new Date(),
): boolean {
  if (!isPrintRequestWhatnotShow(show)) {
    return false;
  }
  if (!canAllocatePrintRequestToShow(show, now)) {
    return false;
  }
  const status = show.productionStatus;
  if (
    typeof status === "string" &&
    MOVE_DESTINATION_BLOCKED_PRODUCTION.has(status as ShowProductionStatus)
  ) {
    return false;
  }
  const capacity = assessShowCapacity({
    maxTotalQuantity: show.maxTotalQuantity,
    allocatedQuantity: show.allocatedQuantity ?? 0,
  });
  if (capacity.isFull) {
    return false;
  }
  return true;
}

export function validateShowQueueMoveDestination(input: {
  sourceShowId: string;
  destinationShowId: string | undefined | null;
  destinationShow: ShowQueueMoveShowInput | null | undefined;
  now?: Date;
}): { valid: true } | { valid: false; blocker: ShowQueueMoveBlocker } {
  const now = input.now ?? new Date();
  const destId = typeof input.destinationShowId === "string" ? input.destinationShowId.trim() : "";
  if (!destId) {
    return {
      valid: false,
      blocker: {
        code: "destination_required",
        message: "Select a destination show.",
      },
    };
  }
  if (destId === input.sourceShowId.trim()) {
    return {
      valid: false,
      blocker: {
        code: "source_same_as_destination",
        message: "Choose a different destination show.",
      },
    };
  }
  if (!input.destinationShow || input.destinationShow.id !== destId) {
    return {
      valid: false,
      blocker: {
        code: "destination_not_found",
        message: "The selected destination show could not be found.",
      },
    };
  }
  if (!isShowQueueMoveDestination(input.destinationShow, now)) {
    const blockReason = getShowAllocationBlockReason(input.destinationShow, now);
    const status = input.destinationShow.productionStatus;
    if (status === "printing") {
      return {
        valid: false,
        blocker: {
          code: "destination_ineligible",
          message: "That show is already printing — pick a pre-production show.",
        },
      };
    }
    return {
      valid: false,
      blocker: {
        code: "destination_ineligible",
        message: formatShowAllocationBlockedMessage(blockReason),
      },
    };
  }
  return { valid: true };
}

export function sumShowQueueMoveQuantity(
  allocations: readonly ShowQueueMoveAllocationSnapshot[],
): number {
  return allocations.reduce((sum, allocation) => sum + Math.max(0, allocation.allocatedQuantity), 0);
}

export function computeShowQueueMoveCapacityProjection(input: {
  destinationAllocatedQuantity: number;
  maxTotalQuantity?: number;
  totalMoveQuantity: number;
}): {
  destinationCurrentAllocatedQuantity: number;
  destinationProjectedAllocatedQuantity: number;
  maxTotalQuantity?: number;
  isOverCapacity: boolean;
  capacityBlocker: ShowQueueMoveCapacityBlocker | null;
} {
  const destinationCurrentAllocatedQuantity = input.destinationAllocatedQuantity;
  const destinationProjectedAllocatedQuantity =
    destinationCurrentAllocatedQuantity + input.totalMoveQuantity;
  const capacity = assessShowCapacity({
    maxTotalQuantity: input.maxTotalQuantity,
    allocatedQuantity: destinationProjectedAllocatedQuantity,
  });

  let capacityBlocker: ShowQueueMoveCapacityBlocker | null = null;
  if (input.maxTotalQuantity !== undefined && capacity.isOverCapacity) {
    capacityBlocker = {
      code: "capacity_exceeded",
      message: `Moving ${input.totalMoveQuantity} would exceed the show max (${destinationProjectedAllocatedQuantity} of ${input.maxTotalQuantity}).`,
      projectedAllocatedQuantity: destinationProjectedAllocatedQuantity,
      maxTotalQuantity: input.maxTotalQuantity,
    };
  }

  return {
    destinationCurrentAllocatedQuantity,
    destinationProjectedAllocatedQuantity,
    maxTotalQuantity: input.maxTotalQuantity,
    isOverCapacity: capacity.isOverCapacity,
    capacityBlocker,
  };
}

function sumNonCanceledOnShow(
  allocations: readonly ShowQueueMoveAllocationSnapshot[],
  showId: string,
  printRequestId: string,
): number {
  return allocations
    .filter(
      (allocation) =>
        allocation.upcomingShowId === showId &&
        allocation.printRequestId === printRequestId &&
        allocation.status !== "canceled",
    )
    .reduce((sum, allocation) => sum + allocation.allocatedQuantity, 0);
}

function sumNonCanceledOnOtherShows(
  allocations: readonly ShowQueueMoveAllocationSnapshot[],
  sourceShowId: string,
  printRequestId: string,
): number {
  return allocations
    .filter(
      (allocation) =>
        allocation.printRequestId === printRequestId &&
        allocation.status !== "canceled" &&
        allocation.upcomingShowId !== sourceShowId,
    )
    .reduce((sum, allocation) => sum + allocation.allocatedQuantity, 0);
}

export function buildShowQueueMoveLines(input: {
  movableAllocations: readonly ShowQueueMoveAllocationSnapshot[];
  allAllocationsForRequests: readonly ShowQueueMoveAllocationSnapshot[];
  sourceShowId: string;
  destinationShowId: string;
}): ShowQueueMoveLine[] {
  const byRequest = new Map<string, ShowQueueMoveAllocationSnapshot[]>();
  for (const allocation of input.movableAllocations) {
    const existing = byRequest.get(allocation.printRequestId) ?? [];
    existing.push(allocation);
    byRequest.set(allocation.printRequestId, existing);
  }

  const lines: ShowQueueMoveLine[] = [];
  for (const [printRequestId, rows] of byRequest) {
    const moveQuantity = sumShowQueueMoveQuantity(rows);
    const requestNameSnapshot =
      rows.find((row) => row.requestNameSnapshot?.trim())?.requestNameSnapshot?.trim() ||
      printRequestId;
    const alreadyOnDestination =
      sumNonCanceledOnShow(input.allAllocationsForRequests, input.destinationShowId, printRequestId) >
      0;

    lines.push({
      printRequestId,
      requestNameSnapshot,
      allocationCount: rows.length,
      moveQuantity,
      alreadyOnDestination,
      otherShowAllocationQuantity: sumNonCanceledOnOtherShows(
        input.allAllocationsForRequests,
        input.sourceShowId,
        printRequestId,
      ),
    });
  }

  return lines.sort((left, right) =>
    left.requestNameSnapshot.localeCompare(right.requestNameSnapshot),
  );
}

export function countDistinctPrintRequestItems(
  allocations: readonly ShowQueueMoveAllocationSnapshot[],
): number {
  const keys = new Set<string>();
  for (const allocation of allocations) {
    keys.add(`${allocation.printRequestId}:${allocation.printRequestItemId ?? ""}`);
  }
  return keys.size;
}

function resolveScheduledStartAtMillis(
  scheduledStartAt: ShowQueueMoveShowInput["scheduledStartAt"],
): number | null {
  if (!scheduledStartAt) {
    return null;
  }
  const candidate = scheduledStartAt as {
    toMillis?: () => number;
    toDate?: () => Date;
  };
  if (typeof candidate.toMillis === "function") {
    return candidate.toMillis();
  }
  if (typeof candidate.toDate === "function") {
    return candidate.toDate().getTime();
  }
  return null;
}

export function buildShowQueueMoveShowSummary(
  show: ShowQueueMoveShowInput,
  projectedAllocatedQuantity?: number,
): ShowQueueMoveShowSummary {
  return {
    id: show.id,
    title: typeof show.title === "string" && show.title.trim() ? show.title.trim() : "Show",
    source: typeof show.source === "string" ? show.source : "unknown",
    productionStatus:
      typeof show.productionStatus === "string" ? show.productionStatus : "open",
    scheduledStartAtMillis: resolveScheduledStartAtMillis(show.scheduledStartAt),
    allocatedQuantity: show.allocatedQuantity ?? 0,
    maxTotalQuantity: show.maxTotalQuantity,
    projectedAllocatedQuantity,
  };
}

export interface ShowQueueMovePreviewChecksumInput {
  scope: ShowQueueMoveScope;
  sourceShowId: string;
  destinationShowId: string;
  printRequestId?: string;
  sourceProductionStatus: string;
  destinationProductionStatus: string;
  sourceAllocations: readonly Pick<
    ShowQueueMoveAllocationSnapshot,
    "id" | "status" | "allocatedQuantity"
  >[];
  destinationAllocatedQuantity: number;
  maxTotalQuantity?: number;
}

export function buildShowQueueMovePreviewChecksum(input: ShowQueueMovePreviewChecksumInput): string {
  const sortedAllocations = [...input.sourceAllocations]
    .map((allocation) => ({
      id: allocation.id,
      status: allocation.status,
      allocatedQuantity: allocation.allocatedQuantity,
    }))
    .sort((left, right) => left.id.localeCompare(right.id));

  return sha256Hex(
    JSON.stringify({
      scope: input.scope,
      sourceShowId: input.sourceShowId,
      destinationShowId: input.destinationShowId,
      printRequestId: input.printRequestId ?? null,
      sourceProductionStatus: input.sourceProductionStatus,
      destinationProductionStatus: input.destinationProductionStatus,
      sourceAllocations: sortedAllocations,
      destinationAllocatedQuantity: input.destinationAllocatedQuantity,
      maxTotalQuantity: input.maxTotalQuantity ?? null,
    }),
  );
}

export function verifyShowQueueMovePreviewChecksum(
  expected: string,
  input: ShowQueueMovePreviewChecksumInput,
): boolean {
  return expected.trim() !== "" && expected === buildShowQueueMovePreviewChecksum(input);
}

export function buildShowQueueMoveBlockers(input: {
  scope: ShowQueueMoveScope;
  sourceShow: ShowQueueMoveShowInput | null;
  destinationValidation: ReturnType<typeof validateShowQueueMoveDestination>;
  movableAllocations: readonly ShowQueueMoveAllocationSnapshot[];
  nonMovableAllocations: readonly ShowQueueMoveAllocationSnapshot[];
  capacityBlocker: ShowQueueMoveCapacityBlocker | null;
  printRequestId?: string;
  now?: Date;
}): ShowQueueMoveBlocker[] {
  const now = input.now ?? new Date();
  const blockers: ShowQueueMoveBlocker[] = [];

  if (!input.sourceShow) {
    blockers.push({ code: "source_not_found", message: "Source show could not be found." });
    return blockers;
  }

  if (!isShowQueueMoveSourceEligible(input.sourceShow, now)) {
    blockers.push({
      code: "source_ineligible",
      message: !isPrintRequestWhatnotShow(input.sourceShow)
        ? "Only Whatnot show queues can use Move to Another Show."
        : "This show cannot move requests (past, printing, or locked). Use recovery workflows when needed.",
    });
  }

  if (input.scope === "print_request" && !input.printRequestId?.trim()) {
    blockers.push({
      code: "print_request_required",
      message: "A print request is required for this move.",
    });
  }

  if (!input.destinationValidation.valid) {
    blockers.push(input.destinationValidation.blocker);
  }

  for (const allocation of input.nonMovableAllocations) {
    blockers.push({
      code: "non_movable_allocations",
      message: `Allocation ${allocation.id} is ${allocation.status} and cannot be moved.`,
      allocationId: allocation.id,
      printRequestId: allocation.printRequestId,
      status: allocation.status,
    });
  }

  if (input.movableAllocations.length === 0 && input.nonMovableAllocations.length === 0) {
    blockers.push({
      code: "no_movable_allocations",
      message:
        input.scope === "whole_show"
          ? "This show has no pending or queued allocations to move."
          : "This print request has no pending or queued allocations on the source show.",
    });
  }

  if (input.movableAllocations.length > SHOW_QUEUE_MOVE_MAX_ALLOCATIONS) {
    blockers.push({
      code: "too_many_allocations",
      message: `This queue has ${input.movableAllocations.length} movable allocations. Bulk move supports at most ${SHOW_QUEUE_MOVE_MAX_ALLOCATIONS} in one operation.`,
    });
  }

  if (input.capacityBlocker) {
    blockers.push({
      code: input.capacityBlocker.code,
      message: input.capacityBlocker.message,
    });
  }

  return blockers;
}

export function assembleShowQueueMovePreview(input: {
  scope: ShowQueueMoveScope;
  sourceShow: ShowQueueMoveShowInput;
  destinationShow: ShowQueueMoveShowInput;
  movableAllocations: readonly ShowQueueMoveAllocationSnapshot[];
  nonMovableAllocations: readonly ShowQueueMoveAllocationSnapshot[];
  allAllocationsForRequests: readonly ShowQueueMoveAllocationSnapshot[];
  printRequestId?: string;
  now?: Date;
}): PreviewShowQueueMoveResponse {
  const now = input.now ?? new Date();
  const totalMoveQuantity = sumShowQueueMoveQuantity(input.movableAllocations);
  const destinationValidation = validateShowQueueMoveDestination({
    sourceShowId: input.sourceShow.id,
    destinationShowId: input.destinationShow.id,
    destinationShow: input.destinationShow,
    now,
  });
  const capacity = computeShowQueueMoveCapacityProjection({
    destinationAllocatedQuantity: input.destinationShow.allocatedQuantity ?? 0,
    maxTotalQuantity: input.destinationShow.maxTotalQuantity,
    totalMoveQuantity,
  });
  const lines = buildShowQueueMoveLines({
    movableAllocations: input.movableAllocations,
    allAllocationsForRequests: input.allAllocationsForRequests,
    sourceShowId: input.sourceShow.id,
    destinationShowId: input.destinationShow.id,
  });
  const blockers = buildShowQueueMoveBlockers({
    scope: input.scope,
    sourceShow: input.sourceShow,
    destinationValidation,
    movableAllocations: input.movableAllocations,
    nonMovableAllocations: input.nonMovableAllocations,
    capacityBlocker: capacity.capacityBlocker,
    printRequestId: input.printRequestId,
    now,
  });
  const canApply = blockers.length === 0 && input.movableAllocations.length > 0;
  const previewChecksum = canApply
    ? buildShowQueueMovePreviewChecksum({
        scope: input.scope,
        sourceShowId: input.sourceShow.id,
        destinationShowId: input.destinationShow.id,
        printRequestId: input.printRequestId,
        sourceProductionStatus:
          typeof input.sourceShow.productionStatus === "string"
            ? input.sourceShow.productionStatus
            : "open",
        destinationProductionStatus:
          typeof input.destinationShow.productionStatus === "string"
            ? input.destinationShow.productionStatus
            : "open",
        sourceAllocations: input.movableAllocations,
        destinationAllocatedQuantity: capacity.destinationCurrentAllocatedQuantity,
        maxTotalQuantity: input.destinationShow.maxTotalQuantity,
      })
    : null;

  const notes: string[] = [
    "Source allocations are canceled and kept for history.",
    "Destination quantities combine by summing non-canceled allocation documents.",
  ];
  if (lines.some((line) => line.alreadyOnDestination)) {
    notes.push("Some print requests already exist on the destination and will combine.");
  }

  return {
    scope: input.scope,
    sourceShow: buildShowQueueMoveShowSummary(input.sourceShow),
    destinationShow: buildShowQueueMoveShowSummary(
      input.destinationShow,
      capacity.destinationProjectedAllocatedQuantity,
    ),
    printRequestId: input.printRequestId,
    lines,
    movableAllocationCount: input.movableAllocations.length,
    affectedPrintRequestCount: lines.length,
    totalMoveQuantity,
    destinationCurrentAllocatedQuantity: capacity.destinationCurrentAllocatedQuantity,
    destinationProjectedAllocatedQuantity: capacity.destinationProjectedAllocatedQuantity,
    maxTotalQuantity: input.destinationShow.maxTotalQuantity,
    printRequestsAlreadyOnDestinationCount: lines.filter((line) => line.alreadyOnDestination)
      .length,
    itemCount: countDistinctPrintRequestItems(input.movableAllocations),
    blockers,
    capacityBlocker: capacity.capacityBlocker,
    canApply,
    previewChecksum,
    notes,
  };
}

export function recomputeShowAllocatedQuantityAfterMove(input: {
  sourceShowId: string;
  destinationShowId: string;
  sourceAllocations: readonly ShowQueueMoveAllocationSnapshot[];
  destinationAllocations: readonly ShowQueueMoveAllocationSnapshot[];
  movedSourceIds: ReadonlySet<string>;
  movedQuantities: readonly { printRequestId: string; allocatedQuantity: number }[];
}): { sourceAllocatedQuantity: number; destinationAllocatedQuantity: number } {
  const postSource = input.sourceAllocations.map((allocation) =>
    input.movedSourceIds.has(allocation.id)
      ? { ...allocation, status: "canceled" }
      : allocation,
  );
  const syntheticDest = input.movedQuantities.map((row, index) => ({
    id: `synthetic-${index}`,
    upcomingShowId: input.destinationShowId,
    printRequestId: row.printRequestId,
    allocatedQuantity: row.allocatedQuantity,
    status: "pending",
  }));
  const postDestination = [...input.destinationAllocations, ...syntheticDest];

  return {
    sourceAllocatedQuantity: computeShowAllocatedQuantityFromAllocations(
      postSource,
      input.sourceShowId,
    ),
    destinationAllocatedQuantity: computeShowAllocatedQuantityFromAllocations(
      postDestination,
      input.destinationShowId,
    ),
  };
}
