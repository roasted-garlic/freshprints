import type { ShowAllocation } from "@fresh-prints/shared/types/showAllocation/showAllocation.types";

export interface MovedDestinationSummary {
  destinationShowIds: string[];
}

/**
 * For canceled source-show allocations, resolve destination show ids via
 * `movedFromAllocationId` (normal MOVE) or `requeuedFromAllocationId` (DNP requeue).
 */
export function buildMovedDestinationByPrintRequestId(input: {
  sourceShowId: string;
  sourceAllocations: readonly ShowAllocation[];
  relatedAllocations: readonly ShowAllocation[];
}): Map<string, MovedDestinationSummary> {
  const canceledOnSource = input.sourceAllocations.filter(
    (allocation) =>
      allocation.upcomingShowId === input.sourceShowId && allocation.status === "canceled",
  );

  if (canceledOnSource.length === 0) {
    return new Map();
  }

  const canceledIdsByRequest = new Map<string, Set<string>>();
  for (const allocation of canceledOnSource) {
    const existing = canceledIdsByRequest.get(allocation.printRequestId) ?? new Set<string>();
    existing.add(allocation.id);
    canceledIdsByRequest.set(allocation.printRequestId, existing);
  }

  const result = new Map<string, MovedDestinationSummary>();

  for (const [printRequestId, sourceIds] of canceledIdsByRequest) {
    const destinationShowIds = new Set<string>();

    for (const allocation of input.relatedAllocations) {
      if (allocation.printRequestId !== printRequestId) {
        continue;
      }
      if (allocation.upcomingShowId === input.sourceShowId) {
        continue;
      }

      const movedFrom = allocation.movedFromAllocationId?.trim();
      const requeuedFrom = allocation.requeuedFromAllocationId?.trim();
      if (
        (movedFrom && sourceIds.has(movedFrom)) ||
        (requeuedFrom && sourceIds.has(requeuedFrom))
      ) {
        destinationShowIds.add(allocation.upcomingShowId);
      }
    }

    if (destinationShowIds.size > 0) {
      result.set(printRequestId, {
        destinationShowIds: [...destinationShowIds].sort(),
      });
    }
  }

  return result;
}
