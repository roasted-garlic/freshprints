import type { ShowProductionStatus } from "../types/upcomingShow/upcomingShow.enums";
import { assessShowCapacity } from "./showCapacity";
import {
  canAllocatePrintRequestToShow,
  PAST_SHOW_READ_ONLY_MESSAGE,
  type ShowWithScheduledStart,
} from "./showScheduleGrouping";

const DONE_OR_CLOSED_STATUSES: ReadonlySet<ShowProductionStatus> = new Set([
  "completed",
  "fully_printed",
  "archived",
  "canceled",
  "full",
]);

export const SHOW_QUEUE_FULL_MESSAGE = "This show is already full — no more requests can be added.";
export const SHOW_QUEUE_DONE_MESSAGE = "This show is finished — no more requests can be added.";

export interface ShowAllocationEligibilityInput extends ShowWithScheduledStart {
  productionStatus?: ShowProductionStatus | string | null;
  maxTotalQuantity?: number;
  allocatedQuantity?: number;
}

export type ShowAllocationBlockReason = "past" | "done" | "full" | null;

/**
 * Whether staff or Portal may add new print-request quantity to a show.
 * Blocks past schedule, finished/full production status, and capacity-full shows.
 */
export function getShowAllocationBlockReason(
  show: ShowAllocationEligibilityInput,
  now: Date = new Date(),
): ShowAllocationBlockReason {
  if (!canAllocatePrintRequestToShow(show, now)) {
    return "past";
  }

  const status = show.productionStatus;
  if (typeof status === "string" && DONE_OR_CLOSED_STATUSES.has(status as ShowProductionStatus)) {
    return status === "full" ? "full" : "done";
  }

  const capacity = assessShowCapacity({
    maxTotalQuantity: show.maxTotalQuantity,
    allocatedQuantity: show.allocatedQuantity ?? 0,
  });

  if (capacity.isFull) {
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
