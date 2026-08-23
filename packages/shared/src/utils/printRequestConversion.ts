import type { PrintRequestClosureKind } from "../types/printRequest/printRequest.types";
import type { ShowAllocationStatus } from "../types/showAllocation/showAllocation.enums";

export const PRINT_REQUEST_CONVERTED_TO_INTERNAL_LABEL =
  "Converted to Internal Request · Closed";

const BLOCKING_ALLOCATION_STATUSES: ShowAllocationStatus[] = [
  "in_progress",
  "printed",
  "done",
];

const CANCELABLE_ALLOCATION_STATUSES: ShowAllocationStatus[] = ["pending", "queued"];

export interface PrintRequestConversionAllocationSummary {
  id: string;
  upcomingShowId: string;
  status: ShowAllocationStatus;
  allocatedQuantity: number;
  requestNameSnapshot?: string;
}

export interface PrintRequestConversionEligibilityResult {
  eligible: boolean;
  reason?: string;
  cancelableAllocations: PrintRequestConversionAllocationSummary[];
  blockingAllocations: PrintRequestConversionAllocationSummary[];
}

export function isPrintRequestConvertedToInternal(closureKind?: PrintRequestClosureKind): boolean {
  return closureKind === "converted_to_internal";
}

export function resolvePortalPrintRequestProgressLabel(input: {
  closureKind?: PrintRequestClosureKind;
  status: string;
  defaultLabel: string;
}): string {
  if (isPrintRequestConvertedToInternal(input.closureKind)) {
    return PRINT_REQUEST_CONVERTED_TO_INTERNAL_LABEL;
  }

  return input.defaultLabel;
}

export function evaluateCustomerPrintRequestConversionEligibility(input: {
  isInternal: boolean;
  requestOrigin?: string;
  closureKind?: PrintRequestClosureKind;
  status: string;
  allocations: PrintRequestConversionAllocationSummary[];
  linkedShowsPrinting: boolean;
}): PrintRequestConversionEligibilityResult {
  if (input.isInternal) {
    return { eligible: false, reason: "Only customer requests can be converted.", cancelableAllocations: [], blockingAllocations: [] };
  }

  if (input.requestOrigin !== "portal_customer" && input.requestOrigin !== "studio_customer") {
    return { eligible: false, reason: "This request type cannot be converted.", cancelableAllocations: [], blockingAllocations: [] };
  }

  if (isPrintRequestConvertedToInternal(input.closureKind)) {
    return { eligible: false, reason: "This request was already converted to an internal request.", cancelableAllocations: [], blockingAllocations: [] };
  }

  if (input.status === "completed" || input.status === "archived") {
    return { eligible: false, reason: "This request is already closed.", cancelableAllocations: [], blockingAllocations: [] };
  }

  if (input.linkedShowsPrinting) {
    return {
      eligible: false,
      reason: "This request is on a show that is currently printing.",
      cancelableAllocations: [],
      blockingAllocations: [],
    };
  }

  const activeAllocations = input.allocations.filter((allocation) => allocation.status !== "canceled");
  const blockingAllocations = activeAllocations.filter((allocation) =>
    BLOCKING_ALLOCATION_STATUSES.includes(allocation.status),
  );
  const cancelableAllocations = activeAllocations.filter((allocation) =>
    CANCELABLE_ALLOCATION_STATUSES.includes(allocation.status),
  );

  if (blockingAllocations.length > 0) {
    return {
      eligible: false,
      reason:
        "This request has print work in progress or already finished on a show. Complete or remove that work before converting.",
      cancelableAllocations,
      blockingAllocations,
    };
  }

  return { eligible: true, cancelableAllocations, blockingAllocations: [] };
}
