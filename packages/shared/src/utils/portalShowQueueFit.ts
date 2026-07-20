import { formatShowCustomerLimitUserMessage } from "./printRequestQuotaUserCopy";
import { planAllocationSplit } from "./showCapacity";

export type PortalShowQueueFitLimit = "none" | "customer_limit" | "show_capacity" | "both";

export interface PortalShowQueueFitInput {
  /** Unallocated quantity still needing a show (this request). */
  requestedQuantity: number;
  /**
   * Spots left on the show from `maxTotalQuantity - allocatedQuantity`.
   * Undefined = show has no capacity cap.
   */
  showRemainingCapacity?: number;
  /** Remaining seats for this customer on this show (`L - existingOnShowQty`). */
  customerLimitRemaining: number;
}

export interface PortalShowQueueFit {
  fittingQuantity: number;
  overflowQuantity: number;
  fitsEntirely: boolean;
  /** True when nothing can be placed on this show (pick another). */
  isBlocked: boolean;
  limitingFactor: PortalShowQueueFitLimit;
}

/**
 * How much of a Portal request can go on one show given per-customer limit `L`
 * and optional show capacity. Effective room is the minimum of customer remaining
 * and show remaining (when capped). Queue requires `fitsEntirely` or clean reject.
 */
export function planPortalShowQueueFit(input: PortalShowQueueFitInput): PortalShowQueueFit {
  const requested = Math.max(0, Math.floor(input.requestedQuantity));
  const customerLimitRemaining = Math.max(0, Math.floor(input.customerLimitRemaining));
  const showRemaining =
    input.showRemainingCapacity === undefined
      ? undefined
      : Math.max(0, Math.floor(input.showRemainingCapacity));

  const effectiveRemaining =
    showRemaining === undefined
      ? customerLimitRemaining
      : Math.min(customerLimitRemaining, showRemaining);

  const split = planAllocationSplit({
    requestedQuantity: requested,
    remainingCapacity: effectiveRemaining,
  });

  if (split.fitsEntirely) {
    return {
      fittingQuantity: split.fittingQuantity,
      overflowQuantity: 0,
      fitsEntirely: true,
      isBlocked: false,
      limitingFactor: "none",
    };
  }

  let limitingFactor: PortalShowQueueFitLimit = "customer_limit";
  if (showRemaining === undefined) {
    limitingFactor = "customer_limit";
  } else if (customerLimitRemaining <= 0 && showRemaining <= 0) {
    limitingFactor = "both";
  } else if (showRemaining < customerLimitRemaining) {
    limitingFactor = "show_capacity";
  } else if (customerLimitRemaining < showRemaining) {
    limitingFactor = "customer_limit";
  } else {
    limitingFactor = "both";
  }

  return {
    fittingQuantity: split.fittingQuantity,
    overflowQuantity: split.overflowQuantity,
    fitsEntirely: false,
    isBlocked: split.fittingQuantity <= 0,
    limitingFactor,
  };
}

/** Remaining seats for this customer on a show under limit `L`. */
export function remainingPerShowCustomerCap(existingOnShowQty: number, cap: number): number {
  if (!Number.isFinite(existingOnShowQty) || !Number.isFinite(cap) || cap < 1) {
    return 0;
  }
  return Math.max(0, Math.floor(cap) - Math.max(0, Math.floor(existingOnShowQty)));
}

/**
 * Atomic reject title when the full request cannot fit on the chosen show.
 * No em dashes; no staff override language.
 */
export function formatPortalOverflowGateTitle(input: { perShowLimit: number }): string {
  const perShowLimit = Math.max(0, Math.floor(input.perShowLimit));
  return `Each Customer Is Limited to ${perShowLimit} Prints Per Show`;
}

/** @deprecated Use formatPortalOverflowGateTitle */
export const formatPortalSplitNeededTitle = formatPortalOverflowGateTitle;

/**
 * Message when the entire Continuable request cannot fit on the chosen show.
 * Used for hard reject (no choose-prints / remainder).
 */
export function formatPortalShowDoesNotFitEntireRequestMessage(input: {
  fittingQuantity: number;
  totalQuantity: number;
}): string {
  const allowed = Math.max(0, Math.floor(input.fittingQuantity));
  const total = Math.max(0, Math.floor(input.totalQuantity));
  if (allowed <= 0) {
    return "This show cannot take your full request. Choose another show, or remove prints and try again.";
  }
  return `This show has room for only ${allowed} of your ${total} prints. Reduce your Current Request to ${allowed} or fewer, or add it to a different show.`;
}

/** @deprecated Prefer formatPortalShowDoesNotFitEntireRequestMessage */
export function formatPortalRemoveFirstOverflowMessage(input: {
  fittingQuantity: number;
  totalQuantity: number;
}): string {
  return formatPortalShowDoesNotFitEntireRequestMessage(input);
}

/** @deprecated Use formatPortalShowDoesNotFitEntireRequestMessage */
export function formatPortalSplitNeededWarning(input: {
  fittingQuantity: number;
  totalQuantity: number;
  requestCapacityLimit?: number;
}): string {
  return formatPortalShowDoesNotFitEntireRequestMessage({
    fittingQuantity: input.fittingQuantity,
    totalQuantity: input.totalQuantity,
  });
}

/**
 * Customer has used all L print spots on this show (not “already have a request”).
 * Pass settings L when available; defaults to 25.
 */
export function formatPortalShowSpotsExhaustedMessage(perShowLimit?: number | null): string {
  return formatShowCustomerLimitUserMessage(perShowLimit);
}

/** @deprecated Use formatPortalShowSpotsExhaustedMessage */
export function formatPortalShowAlreadyAssignedMessage(perShowLimit?: number | null): string {
  return formatPortalShowSpotsExhaustedMessage(perShowLimit);
}

/** When this show cannot take any more of the customer's request. */
export function formatPortalShowQueueBlockedMessage(
  limitingFactor: PortalShowQueueFitLimit,
  perShowLimit?: number | null,
): string {
  if (limitingFactor === "customer_limit") {
    return formatPortalShowSpotsExhaustedMessage(perShowLimit);
  }
  if (limitingFactor === "show_capacity") {
    return "This show is already full. Please choose another show.";
  }
  if (limitingFactor === "both") {
    return "This show cannot take your full request. Please choose another show.";
  }
  return "Please choose another show.";
}

/** Sum of non-canceled allocation quantities keyed by printRequestItemId. */
export function sumAllocatedQuantityByItemId(
  allocations: ReadonlyArray<{ printRequestItemId: string; allocatedQuantity: number; status: string }>,
): Map<string, number> {
  const byItem = new Map<string, number>();
  for (const allocation of allocations) {
    if (allocation.status === "canceled") {
      continue;
    }
    const qty =
      typeof allocation.allocatedQuantity === "number" && Number.isFinite(allocation.allocatedQuantity)
        ? Math.max(0, Math.floor(allocation.allocatedQuantity))
        : 0;
    if (qty <= 0) {
      continue;
    }
    const id = allocation.printRequestItemId;
    byItem.set(id, (byItem.get(id) ?? 0) + qty);
  }
  return byItem;
}

export function remainingUnallocatedQuantityForItem(
  itemQuantity: number,
  alreadyAllocated: number,
): number {
  return Math.max(0, Math.floor(itemQuantity) - Math.max(0, Math.floor(alreadyAllocated)));
}

export function sumRemainingUnallocatedQuantity(
  items: ReadonlyArray<{ id: string; quantity: number }>,
  allocatedByItemId: ReadonlyMap<string, number>,
): number {
  let total = 0;
  for (const item of items) {
    total += remainingUnallocatedQuantityForItem(item.quantity, allocatedByItemId.get(item.id) ?? 0);
  }
  return total;
}
