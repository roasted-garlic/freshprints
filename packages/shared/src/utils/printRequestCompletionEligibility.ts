import { isPrintedAllocationStatus } from "./showAllocationTotals";

export interface PrintRequestCompletionEligibilityInput {
  requestStatus: string;
  items: ReadonlyArray<{ quantity: number }>;
  allocations: ReadonlyArray<{ status: string; allocatedQuantity: number }>;
}

export type PrintRequestCompletionEligibility =
  | "already_terminal"
  | "not_eligible"
  | "eligible";

/**
 * Whether a print request should transition to `completed` after show-finish reconciliation.
 * Mirrors Studio `reconcileCompletedPrintRequest` eligibility (not_fully_printed gate).
 */
export function evaluatePrintRequestCompletionEligibility(
  input: PrintRequestCompletionEligibilityInput,
): PrintRequestCompletionEligibility {
  if (input.requestStatus === "completed" || input.requestStatus === "archived") {
    return "already_terminal";
  }

  const totalRequestedQuantity = input.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrintedQuantity = input.allocations
    .filter((allocation) => allocation.status !== "canceled")
    .filter((allocation) => isPrintedAllocationStatus(allocation.status as never))
    .reduce((sum, allocation) => sum + allocation.allocatedQuantity, 0);

  if (totalRequestedQuantity <= 0 || totalPrintedQuantity < totalRequestedQuantity) {
    return "not_eligible";
  }

  return "eligible";
}
