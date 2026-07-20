import type { ShowAllocationStatus } from "../types/showAllocation/showAllocation.enums";
import { formatShowCustomerLimitUserMessage } from "./printRequestQuotaUserCopy";

/**
 * Per-show customer allotment (`L`): allocations that still count toward the budget.
 * Excludes canceled only (printed/done still consumed the allotment for that show).
 */
export function countsTowardPerShowCustomerCap(status: string): boolean {
  return status !== "canceled";
}

export function sumCustomerQuantityOnShow(
  allocations: ReadonlyArray<{ allocatedQuantity: number; status: string }>,
): number {
  let total = 0;
  for (const allocation of allocations) {
    if (!countsTowardPerShowCustomerCap(allocation.status)) {
      continue;
    }
    const qty = allocation.allocatedQuantity;
    if (typeof qty === "number" && Number.isFinite(qty) && qty > 0) {
      total += Math.floor(qty);
    }
  }
  return total;
}

export function wouldExceedPerShowCustomerCap(
  existingOnShowQty: number,
  newRequestQty: number,
  cap: number,
): boolean {
  if (
    !Number.isFinite(existingOnShowQty) ||
    !Number.isFinite(newRequestQty) ||
    !Number.isFinite(cap) ||
    existingOnShowQty < 0 ||
    newRequestQty < 0 ||
    cap < 1
  ) {
    return true;
  }
  return existingOnShowQty + newRequestQty > cap;
}

export function perShowCustomerCapExceededMessage(input: {
  cap: number;
  existingOnShowQty: number;
  newRequestQty: number;
}): string {
  const safeCap = Number.isFinite(input.cap) && input.cap > 0 ? Math.floor(input.cap) : 0;
  const existing =
    Number.isFinite(input.existingOnShowQty) && input.existingOnShowQty > 0
      ? Math.floor(input.existingOnShowQty)
      : 0;
  const requested =
    Number.isFinite(input.newRequestQty) && input.newRequestQty > 0
      ? Math.floor(input.newRequestQty)
      : 0;
  const allowed = Math.max(0, safeCap - existing);
  if (allowed <= 0) {
    return formatShowCustomerLimitUserMessage(safeCap > 0 ? safeCap : 25);
  }
  const toRemove = Math.max(0, requested - allowed);
  return `This show has room for only ${allowed} of your ${requested} prints (limit ${safeCap}). Reduce your Current Request by ${toRemove}, or add it to a different show.`;
}

/** Type-narrow helper for callers that already have typed statuses. */
export function isActiveShowAllocationStatus(
  status: ShowAllocationStatus | string,
): boolean {
  return countsTowardPerShowCustomerCap(status);
}
