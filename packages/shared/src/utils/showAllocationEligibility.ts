import type { ShowProductionStatus } from "../types/upcomingShow/upcomingShow.enums";
import { assessShowCapacity } from "./showCapacity";
import {
  canAllocatePrintRequestToShow,
  PAST_SHOW_READ_ONLY_MESSAGE,
  type ShowWithScheduledStart,
} from "./showScheduleGrouping";

/** Terminal / finished production — never overridable via show-capacity override. */
const TERMINAL_PRODUCTION_STATUSES: ReadonlySet<ShowProductionStatus> = new Set([
  "completed",
  "fully_printed",
  "archived",
  "canceled",
]);

export const SHOW_QUEUE_FULL_MESSAGE = "This show is already full — no more requests can be added.";
export const SHOW_QUEUE_DONE_MESSAGE = "This show is finished — no more requests can be added.";

export interface ShowAllocationEligibilityInput extends ShowWithScheduledStart {
  productionStatus?: ShowProductionStatus | string | null;
  maxTotalQuantity?: number;
  allocatedQuantity?: number;
}

export interface ShowAllocationBlockReasonOptions {
  /**
   * When true, capacity-driven full (including productionStatus `"full"`) is allowed so staff may
   * explicitly exceed `maxTotalQuantity`. Past schedule and terminal statuses still block.
   */
  allowCapacityFullOverride?: boolean;
}

export type ShowAllocationBlockReason = "past" | "done" | "full" | null;

/**
 * Whether staff or Portal may add new print-request quantity to a show.
 * Blocks past schedule, finished/full production status, and capacity-full shows.
 * Pass `allowCapacityFullOverride: true` only on the trusted Studio capacity-override path.
 */
export function getShowAllocationBlockReason(
  show: ShowAllocationEligibilityInput,
  now: Date = new Date(),
  options: ShowAllocationBlockReasonOptions = {},
): ShowAllocationBlockReason {
  if (!canAllocatePrintRequestToShow(show, now)) {
    return "past";
  }

  const status = show.productionStatus;
  if (typeof status === "string" && TERMINAL_PRODUCTION_STATUSES.has(status as ShowProductionStatus)) {
    return "done";
  }

  const allowCapacityFullOverride = options.allowCapacityFullOverride === true;

  if (status === "full" && !allowCapacityFullOverride) {
    return "full";
  }

  const capacity = assessShowCapacity({
    maxTotalQuantity: show.maxTotalQuantity,
    allocatedQuantity: show.allocatedQuantity ?? 0,
  });

  if (capacity.isFull && !allowCapacityFullOverride) {
    return "full";
  }

  return null;
}

export function canAcceptNewShowAllocations(
  show: ShowAllocationEligibilityInput,
  now: Date = new Date(),
): boolean {
  return getShowAllocationBlockReason(show, now) === null;
}

export function formatShowAllocationBlockedMessage(reason: ShowAllocationBlockReason): string {
  switch (reason) {
    case "past":
      return PAST_SHOW_READ_ONLY_MESSAGE;
    case "full":
      return SHOW_QUEUE_FULL_MESSAGE;
    case "done":
      return SHOW_QUEUE_DONE_MESSAGE;
    default:
      return "This show is not accepting new requests.";
  }
}

export interface ShowCapacityOverrideSummary {
  currentAllocated: number;
  maxTotalQuantity: number;
  addingQuantity: number;
  newTotal: number;
}

export function buildShowCapacityOverrideSummary(input: {
  currentAllocated: number;
  maxTotalQuantity: number;
  addingQuantity: number;
}): ShowCapacityOverrideSummary {
  return {
    currentAllocated: input.currentAllocated,
    maxTotalQuantity: input.maxTotalQuantity,
    addingQuantity: input.addingQuantity,
    newTotal: input.currentAllocated + input.addingQuantity,
  };
}

export function wouldExceedShowCapacity(input: {
  maxTotalQuantity?: number;
  currentAllocated: number;
  addingQuantity: number;
}): boolean {
  if (input.maxTotalQuantity === undefined) {
    return false;
  }
  return input.currentAllocated + input.addingQuantity > input.maxTotalQuantity;
}
