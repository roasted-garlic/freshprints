import type {
  StaffInboxPortalAllocationSnapshot,
  StaffInboxQueuedGlanceMetrics,
} from "./staffInbox.types";
import { buildShowAllocationOperationalSummary } from "../utils/showAllocationSummaries";

export type { StaffInboxQueuedGlanceMetrics };

const ACTIVE_ALLOCATION_STATUSES = new Set(["pending", "queued", "in_progress"]);

function isActiveAllocationStatus(status: string): boolean {
  return ACTIVE_ALLOCATION_STATUSES.has(status);
}

/**
 * Summarize design count, print qty, and priceable units for one queued
 * request+show alert from its active portal allocations.
 */
export function buildStaffInboxQueuedGlanceMetrics(
  allocations: readonly StaffInboxPortalAllocationSnapshot[],
): StaffInboxQueuedGlanceMetrics | null {
  const active = allocations.filter((allocation) => isActiveAllocationStatus(allocation.status));
  if (active.length === 0) {
    return null;
  }

  const summary = buildShowAllocationOperationalSummary(active);

  return {
    designCount: summary.uniqueDesignCount,
    printQuantity: summary.totalQuantity,
    pricingUnits: summary.pricingUnits,
  };
}

export function filterAllocationsForQueuedGroup(
  allocations: readonly StaffInboxPortalAllocationSnapshot[],
  printRequestId: string,
  upcomingShowId: string,
): StaffInboxPortalAllocationSnapshot[] {
  return allocations.filter(
    (allocation) =>
      allocation.printRequestId === printRequestId && allocation.upcomingShowId === upcomingShowId,
  );
}
