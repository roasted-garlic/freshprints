import type { ShowAllocationStatus } from "../types/showAllocation/showAllocation.enums";

export interface ShowAllocationAttachmentLineInput {
  allocatedQuantity: number;
  designTitleSnapshot?: string;
  printHeightInches?: number;
  printWidthInches?: number;
  sizeLabel?: string;
  sourceType?: "catalog_design" | "customer_upload";
  status: ShowAllocationStatus;
}

export function sumShowAllocationQuantities(
  allocations: readonly Pick<ShowAllocationAttachmentLineInput, "allocatedQuantity">[],
): number {
  return allocations.reduce((sum, allocation) => sum + allocation.allocatedQuantity, 0);
}

export function partitionShowAllocationsByCanceled(
  allocations: readonly ShowAllocationAttachmentLineInput[],
): {
  active: ShowAllocationAttachmentLineInput[];
  released: ShowAllocationAttachmentLineInput[];
} {
  const active: ShowAllocationAttachmentLineInput[] = [];
  const released: ShowAllocationAttachmentLineInput[] = [];

  for (const allocation of allocations) {
    if (allocation.status === "canceled") {
      released.push(allocation);
    } else {
      active.push(allocation);
    }
  }

  return { active, released };
}

export function formatShowAllocationAttachmentLine(
  allocation: ShowAllocationAttachmentLineInput,
): string {
  const title =
    allocation.designTitleSnapshot?.trim() ||
    (allocation.sourceType === "customer_upload" ? "Customer upload" : "Design");
  const size =
    allocation.sizeLabel?.trim() ||
    (allocation.printWidthInches && allocation.printHeightInches
      ? `${allocation.printWidthInches}×${allocation.printHeightInches}"`
      : null);
  const parts = [title];

  if (size) {
    parts.push(size);
  }

  parts.push(`Qty ${allocation.allocatedQuantity}`);
  return parts.join(" · ");
}

export function formatShowAllocationRequestGroupStatusLabel(
  allocations: readonly ShowAllocationAttachmentLineInput[],
  options?: { treatCanceledAsReleased?: boolean },
): string {
  if (allocations.length === 0) {
    return "pending";
  }

  const statuses = new Set(allocations.map((allocation) => allocation.status));

  if (statuses.size === 1) {
    const [status] = [...statuses];
    if (status === "canceled" && options?.treatCanceledAsReleased) {
      return "Released";
    }
    return status;
  }

  if (statuses.size === 2 && statuses.has("canceled") && options?.treatCanceledAsReleased) {
    return "Mixed";
  }

  return "Mixed";
}
