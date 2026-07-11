import { assessShowCapacity } from "./showCapacity";

export function sumPrintRequestItemQuantities(items: ReadonlyArray<{ quantity: number }>): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

/** Returns false when a capped show cannot fit `totalQuantity` (no staff override). */
export function canFitPrintRequestOnShow(input: {
  totalQuantity: number;
  maxTotalQuantity?: number;
  allocatedQuantity: number;
}): boolean {
  const capacity = assessShowCapacity({
    maxTotalQuantity: input.maxTotalQuantity,
    allocatedQuantity: input.allocatedQuantity,
  });

  if (capacity.remainingQuantity === undefined) {
    return true;
  }

  return input.totalQuantity <= capacity.remainingQuantity;
}

/** Friendly customer-facing copy when a show cannot fit the request. */
export function formatShowCapacityExceededMessage(_totalQuantity: number, remainingQuantity: number): string {
  if (remainingQuantity <= 0) {
    return "This show is already full — please choose another show.";
  }

  return "There aren’t enough spots left on this show for your request — please choose another show.";
}
