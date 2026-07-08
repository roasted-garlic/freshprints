export type PrintRequestQueueState =
  | "not_queued"
  | "partially_queued"
  | "queued"
  | "printing"
  | "partially_printed"
  | "printed";

export interface PrintRequestQueueStateInput {
  /** Sum of all `printRequestItems.quantity` for the request. */
  totalRequestedQuantity: number;
  /** Sum of `allocatedQuantity` across all non-canceled `showAllocations` for the request. */
  totalAllocatedQuantity: number;
  /** Sum of `allocatedQuantity` across allocations with status `in_progress`. */
  totalInProgressQuantity: number;
  /** Sum of `allocatedQuantity` across allocations with status `printed` or `done`. */
  totalPrintedQuantity: number;
}

export type PrintRequestFulfillmentStatus = "draft" | "active" | "editing" | "completed" | "archived";

export interface PrintRequestFulfillmentInput extends PrintRequestQueueStateInput {
  status: PrintRequestFulfillmentStatus;
}

/**
 * True when every requested quantity has been printed or the request lifecycle is completed.
 * Used to lock editing, design changes, and show attachment for finished work.
 */
export function isPrintRequestFullyPrinted(input: PrintRequestFulfillmentInput): boolean {
  if (input.status === "completed") {
    return true;
  }

  return derivePrintRequestQueueState(input) === "printed";
}

/**
 * Derives a Print Request's queue/print badge purely from its show allocations — there is no
 * persisted `printQueueStatus` field, so this must be recomputed from allocation records
 * whenever it's displayed. "Partially queued" means only part of the request's total quantity
 * has been allocated to a show, not that printing itself is in progress.
 */
export function derivePrintRequestQueueState(input: PrintRequestQueueStateInput): PrintRequestQueueState {
  if (input.totalRequestedQuantity <= 0) {
    return "not_queued";
  }

  if (input.totalPrintedQuantity >= input.totalRequestedQuantity) {
    return "printed";
  }

  if (input.totalInProgressQuantity > 0) {
    return "printing";
  }

  if (input.totalPrintedQuantity > 0) {
    return "partially_printed";
  }

  if (input.totalAllocatedQuantity >= input.totalRequestedQuantity) {
    return "queued";
  }

  if (input.totalAllocatedQuantity > 0) {
    return "partially_queued";
  }

  return "not_queued";
}
