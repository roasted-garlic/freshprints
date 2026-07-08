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

export function formatShowCapacityExceededMessage(totalQuantity: number, remainingQuantity: number): string {
  return `This show only has ${remainingQuantity} spot${remainingQuantity === 1 ? "" : "s"} left, but your request has ${totalQuantity} print${totalQuantity === 1 ? "" : "s"}. Choose a different show or contact staff.`;
}
