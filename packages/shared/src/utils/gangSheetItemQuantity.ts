/**
 * Counts placed copies per `showAllocationId` and reports remaining placeable quantity, so the
 * builder can block placing more physical copies than a show allocation actually allows. One
 * physical printed copy corresponds to exactly one placed `gangSheetItem`.
 */
export interface PlacedCopyCountsInput {
  showAllocationId: string;
  allocatedQuantity: number;
}

export interface PlacedCopyAvailability {
  showAllocationId: string;
  allocatedQuantity: number;
  placedCount: number;
  remainingPlaceable: number;
  isFullyPlaced: boolean;
}

export function countPlacedCopiesByAllocation(
  placedItems: { showAllocationId: string }[],
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const item of placedItems) {
    counts.set(item.showAllocationId, (counts.get(item.showAllocationId) ?? 0) + 1);
  }

  return counts;
}

export function assessPlacedCopyAvailability(
  allocations: PlacedCopyCountsInput[],
  placedItems: { showAllocationId: string }[],
): PlacedCopyAvailability[] {
  const placedCounts = countPlacedCopiesByAllocation(placedItems);

  return allocations.map((allocation) => {
    const placedCount = placedCounts.get(allocation.showAllocationId) ?? 0;
    const remainingPlaceable = Math.max(0, allocation.allocatedQuantity - placedCount);

    return {
      showAllocationId: allocation.showAllocationId,
      allocatedQuantity: allocation.allocatedQuantity,
      placedCount,
      remainingPlaceable,
      isFullyPlaced: remainingPlaceable <= 0,
    };
  });
}

/**
 * True when placing one more copy for `showAllocationId` would exceed the allocation's quantity.
 */
export function canPlaceAnotherCopy(
  allocatedQuantity: number,
  placedItems: { showAllocationId: string }[],
  showAllocationId: string,
): boolean {
  const placedCount = placedItems.filter((item) => item.showAllocationId === showAllocationId).length;
  return placedCount < allocatedQuantity;
}
