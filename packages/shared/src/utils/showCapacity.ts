export interface ShowCapacityInput {
  maxTotalQuantity?: number;
  allocatedQuantity: number;
}

export interface ShowCapacityResult {
  maxTotalQuantity?: number;
  allocatedQuantity: number;
  /** Undefined when there is no cap (unlimited remaining). */
  remainingQuantity?: number;
  isFull: boolean;
  isOverCapacity: boolean;
}

export function assessShowCapacity(input: ShowCapacityInput): ShowCapacityResult {
  if (input.maxTotalQuantity === undefined) {
    return {
      maxTotalQuantity: undefined,
      allocatedQuantity: input.allocatedQuantity,
      remainingQuantity: undefined,
      isFull: false,
      isOverCapacity: false,
    };
  }

  const remainingQuantity = input.maxTotalQuantity - input.allocatedQuantity;

  return {
    maxTotalQuantity: input.maxTotalQuantity,
    allocatedQuantity: input.allocatedQuantity,
    remainingQuantity,
    isFull: remainingQuantity <= 0,
    isOverCapacity: input.allocatedQuantity > input.maxTotalQuantity,
  };
}

export interface AllocationSplitPlanInput {
  requestedQuantity: number;
  remainingCapacity?: number;
}

export interface AllocationSplitPlan {
  /** Quantity that fits within the show's remaining capacity right now. */
  fittingQuantity: number;
  /** Quantity that does not fit and would need another show or an override. */
  overflowQuantity: number;
  fitsEntirely: boolean;
}

/**
 * Plans how much of a requested quantity fits into a show's remaining capacity, so staff can
 * be offered "add what fits and split the rest" without mutating anything yet. When
 * `remainingCapacity` is undefined, the show has no cap and the full quantity always fits.
 */
export function planAllocationSplit(input: AllocationSplitPlanInput): AllocationSplitPlan {
  if (input.remainingCapacity === undefined) {
    return { fittingQuantity: input.requestedQuantity, overflowQuantity: 0, fitsEntirely: true };
  }

  const fittingQuantity = Math.max(0, Math.min(input.requestedQuantity, input.remainingCapacity));
  const overflowQuantity = input.requestedQuantity - fittingQuantity;

  return {
    fittingQuantity,
    overflowQuantity,
    fitsEntirely: overflowQuantity === 0,
  };
}
