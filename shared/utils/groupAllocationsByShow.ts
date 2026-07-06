import type { ShowAllocation } from "../types/showAllocation/showAllocation.types";

export interface ShowAllocationShowGroup {
  upcomingShowId: string;
  allocations: ShowAllocation[];
}

/**
 * Groups a single Print Request's allocations by the show they're on, so the Print Requests page
 * can link to (and remove from) each show a split request is queued to — the mirror image of
 * `groupAllocationsByRequest`, which groups one show's allocations by request.
 */
export function groupAllocationsByShow(allocations: ShowAllocation[]): ShowAllocationShowGroup[] {
  const map = new Map<string, ShowAllocationShowGroup>();

  for (const allocation of allocations) {
    const existing = map.get(allocation.upcomingShowId);

    if (existing) {
      existing.allocations.push(allocation);
    } else {
      map.set(allocation.upcomingShowId, {
        upcomingShowId: allocation.upcomingShowId,
        allocations: [allocation],
      });
    }
  }

  return [...map.values()];
}
