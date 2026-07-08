import type { ShowAllocation } from "@fresh-prints/shared/types/showAllocation/showAllocation.types";

export interface ShowAllocationRequestGroup {
  printRequestId: string;
  requestNameSnapshot: string;
  allocations: ShowAllocation[];
}

/**
 * Groups a show's allocations by Print Request so the Show Queue detail page can display and
 * act on whole requests (attach/remove) instead of individual allocation rows, matching the
 * whole-request "+ Add Print Request" attach flow.
 */
export function groupAllocationsByRequest(allocations: ShowAllocation[]): ShowAllocationRequestGroup[] {
  const map = new Map<string, ShowAllocationRequestGroup>();

  for (const allocation of allocations) {
    const existing = map.get(allocation.printRequestId);

    if (existing) {
      existing.allocations.push(allocation);
    } else {
      map.set(allocation.printRequestId, {
        printRequestId: allocation.printRequestId,
        requestNameSnapshot: allocation.requestNameSnapshot,
        allocations: [allocation],
      });
    }
  }

  return [...map.values()];
}
