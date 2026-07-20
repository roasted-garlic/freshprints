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

/** Friendly customer-facing copy when a show cannot fit the full request (remove-first). */
export function formatShowCapacityExceededMessage(totalQuantity: number, remainingQuantity: number): string {
  const remaining = Math.max(0, Math.floor(remainingQuantity));
  if (remaining <= 0) {
    return "This show is already full. Please choose another show.";
  }

  const total = Math.max(0, Math.floor(totalQuantity));
  const toRemove = Math.max(0, total - remaining);
  return `You can add at most ${remaining} prints to this show. Your request has ${total} prints. Remove or lower quantities by ${toRemove} before adding to this show.`;
}
