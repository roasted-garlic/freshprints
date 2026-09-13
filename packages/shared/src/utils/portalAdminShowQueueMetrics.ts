/**
 * Portal admin Show Queue glance metrics (ADR-FP-187 amendment).
 * Design Qty uses distinct non-canceled design/upload identities (not allocation row count).
 */

export type PortalAdminMetricAllocation = {
  status: string;
  allocatedQuantity: number;
  printRequestId: string;
  sourceType?: string | null;
  designId?: string | null;
  customerUploadId?: string | null;
  staffArtworkId?: string | null;
  /** Fallback uniqueness when identity fields are missing. */
  allocationId: string;
};

export function isNonCanceledAllocation(status: string): boolean {
  return status !== "canceled";
}

export function resolvePortalAdminDesignIdentity(allocation: PortalAdminMetricAllocation): string {
  const isUpload =
    allocation.sourceType === "customer_upload" ||
    (typeof allocation.customerUploadId === "string" && allocation.customerUploadId.trim().length > 0);
  if (isUpload) {
    const uploadId = allocation.customerUploadId?.trim();
    return uploadId ? `upload:${uploadId}` : `allocation:${allocation.allocationId}`;
  }
  if (
    allocation.sourceType === "staff_artwork" ||
    (typeof allocation.staffArtworkId === "string" && allocation.staffArtworkId.trim().length > 0)
  ) {
    const staffArtworkId = allocation.staffArtworkId?.trim();
    return staffArtworkId ? `staff-artwork:${staffArtworkId}` : `allocation:${allocation.allocationId}`;
  }
  const designId = allocation.designId?.trim();
  return designId ? `design:${designId}` : `allocation:${allocation.allocationId}`;
}

/** Distinct non-canceled design/upload identities. */
export function countPortalAdminDesignQty(allocations: readonly PortalAdminMetricAllocation[]): number {
  const identities = new Set<string>();
  for (const allocation of allocations) {
    if (!isNonCanceledAllocation(allocation.status)) {
      continue;
    }
    identities.add(resolvePortalAdminDesignIdentity(allocation));
  }
  return identities.size;
}

/** Sum of non-canceled allocatedQuantity. */
export function sumPortalAdminPrintQty(allocations: readonly PortalAdminMetricAllocation[]): number {
  return allocations.reduce((sum, allocation) => {
    if (!isNonCanceledAllocation(allocation.status)) {
      return sum;
    }
    const quantity =
      typeof allocation.allocatedQuantity === "number" && Number.isFinite(allocation.allocatedQuantity)
        ? Math.max(0, allocation.allocatedQuantity)
        : 0;
    return sum + quantity;
  }, 0);
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
