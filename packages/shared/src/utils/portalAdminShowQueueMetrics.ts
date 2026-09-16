/**
 * Portal admin Show Queue glance metrics (ADR-FP-187 amendment).
 * Design Qty uses distinct non-canceled design/upload identities (not allocation row count).
 */

import {
  buildShowAllocationOperationalSummary,
  resolveShowAllocationDesignIdentity,
} from "./showAllocationSummaries";

export type PortalAdminMetricAllocation = {
  allocationId: string;
  status: string;
  allocatedQuantity: number;
  printRequestId: string;
  printRequestItemId?: string | null;
  sourceType?: string | null;
  designId?: string | null;
  customerUploadId?: string | null;
  staffArtworkId?: string | null;
};

export function isNonCanceledAllocation(status: string): boolean {
  return status !== "canceled";
}

export function resolvePortalAdminDesignIdentity(allocation: PortalAdminMetricAllocation): string {
  return resolveShowAllocationDesignIdentity(allocation);
}

/** Distinct non-canceled design/upload identities. */
export function countPortalAdminDesignQty(allocations: readonly PortalAdminMetricAllocation[]): number {
  return buildShowAllocationOperationalSummary(allocations).uniqueDesignCount;
}

/** Sum of non-canceled allocatedQuantity. */
export function sumPortalAdminPrintQty(allocations: readonly PortalAdminMetricAllocation[]): number {
  return buildShowAllocationOperationalSummary(allocations).totalQuantity;
}

/** Distinct printRequestId with at least one non-canceled allocation. */
export function countPortalAdminPrQty(allocations: readonly PortalAdminMetricAllocation[]): number {
  const ids = new Set<string>();
  for (const allocation of allocations) {
    if (!isNonCanceledAllocation(allocation.status)) {
      continue;
    }
    const requestId = allocation.printRequestId?.trim();
    if (requestId) {
      ids.add(requestId);
    }
  }
  return ids.size;
}
