import type { ShowAllocationStatus } from "../types/showAllocation/showAllocation.enums";
import { isPastScheduledShow, type ShowWithScheduledStart } from "./showScheduleGrouping";

export interface ShowAllocationQuantityInput {
  status: ShowAllocationStatus;
  allocatedQuantity: number;
}

export function sumShowAllocationQuantities(
  allocations: readonly ShowAllocationQuantityInput[],
  options: { includeCanceled: boolean },
): number {
  const rows = options.includeCanceled
    ? allocations
    : allocations.filter((allocation) => allocation.status !== "canceled");

  return rows.reduce((sum, allocation) => sum + allocation.allocatedQuantity, 0);
}

/**
 * Resolves the quantity shown on show capacity UI. Past shows may still have canceled allocation
 * rows after Did Not Print release even when the show summary `allocatedQuantity` is zeroed.
 */
export function resolveShowDisplayAllocatedQuantity(input: {
  show: ShowWithScheduledStart & { allocatedQuantity?: number };
  allocations?: readonly ShowAllocationQuantityInput[];
  now?: Date;
}): number {
  const summaryQuantity = input.show.allocatedQuantity ?? 0;
  if (summaryQuantity > 0) {
    return summaryQuantity;
  }

  const allocations = input.allocations ?? [];
  if (allocations.length === 0) {
    return summaryQuantity;
  }

  const activeTotal = sumShowAllocationQuantities(allocations, { includeCanceled: false });
  if (activeTotal > 0) {
    return activeTotal;
  }

  if (!isPastScheduledShow(input.show, input.now ?? new Date())) {
    return summaryQuantity;
  }

  return sumShowAllocationQuantities(allocations, { includeCanceled: true });
}
