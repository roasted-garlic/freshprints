import { resolvePrintRequestItemIdentity } from "./printRequestItemSource";

export interface ShowAllocationSummaryInput {
  allocationId?: string | null;
  printRequestItemId?: string | null;
  fallbackIdentity?: string | null;
  sourceType?: string | null;
  designId?: string | null;
  customerUploadId?: string | null;
  staffArtworkId?: string | null;
  status: string;
  allocatedQuantity?: number | null;
  printWidthInches?: number | null;
  printHeightInches?: number | null;
}

export interface ShowAllocationOperationalSummary {
  uniqueDesignCount: number;
  totalQuantity: number;
  activeAllocationCount: number;
  canceledAllocationCount: number;
  sizeClassRows: Array<{
    printWidthInches: number;
    quantity: number;
  }>;
  pricingUnits: Array<{
    printWidthInches: number;
    printHeightInches: number;
    quantity: number;
  }>;
}

export function isCurrentShowAllocation(allocation: Pick<ShowAllocationSummaryInput, "status">): boolean {
  return allocation.status !== "canceled";
}

export function filterCurrentShowAllocations<T extends Pick<ShowAllocationSummaryInput, "status">>(
  allocations: readonly T[],
): T[] {
  return allocations.filter(isCurrentShowAllocation);
}

function normalizeSourceType(value: string | null | undefined):
  | "catalog_design"
  | "customer_upload"
  | "staff_artwork"
  | undefined {
  return value === "catalog_design" || value === "customer_upload" || value === "staff_artwork"
    ? value
    : undefined;
}

export function resolveShowAllocationDesignIdentity(
  allocation: ShowAllocationSummaryInput,
): string {
  const fallbackId =
    allocation.printRequestItemId?.trim() ||
    allocation.allocationId?.trim() ||
    allocation.fallbackIdentity?.trim();
  return resolvePrintRequestItemIdentity({
    id: fallbackId || "missing-allocation",
    sourceType: normalizeSourceType(allocation.sourceType),
    designId: allocation.designId?.trim() || undefined,
    customerUploadId: allocation.customerUploadId?.trim() || undefined,
    staffArtworkId: allocation.staffArtworkId?.trim() || undefined,
  });
}

function resolveQuantity(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function buildShowAllocationOperationalSummary(
  allocations: readonly ShowAllocationSummaryInput[],
): ShowAllocationOperationalSummary {
  const active = filterCurrentShowAllocations(allocations);
  const identities = new Set(
    active.map((allocation, index) =>
      resolveShowAllocationDesignIdentity({
        ...allocation,
        fallbackIdentity: allocation.fallbackIdentity?.trim() || `row:${index}`,
      }),
    ),
  );
  const sizeClassRows: ShowAllocationOperationalSummary["sizeClassRows"] = [];
  const pricingUnits: ShowAllocationOperationalSummary["pricingUnits"] = [];

  for (const allocation of active) {
    const quantity = resolveQuantity(allocation.allocatedQuantity);
    const width = allocation.printWidthInches;
    if (
      quantity <= 0 ||
      typeof width !== "number" ||
      !Number.isFinite(width) ||
      width <= 0
    ) {
      continue;
    }

    sizeClassRows.push({ printWidthInches: width, quantity });
    pricingUnits.push({
      printWidthInches: width,
      printHeightInches:
        typeof allocation.printHeightInches === "number" &&
        Number.isFinite(allocation.printHeightInches) &&
        allocation.printHeightInches > 0
          ? allocation.printHeightInches
          : 1,
      quantity,
    });
  }

  return {
    uniqueDesignCount: identities.size,
    totalQuantity: active.reduce(
      (sum, allocation) => sum + resolveQuantity(allocation.allocatedQuantity),
      0,
    ),
    activeAllocationCount: active.length,
    canceledAllocationCount: allocations.length - active.length,
    sizeClassRows,
    pricingUnits,
  };
}
