export type PortalQueueTransactionBlockReason =
  | "request_already_allocated"
  | "customer_show_cap_exceeded";

export interface PortalQueueTransactionEligibilityInput {
  requestHasExistingAllocation: boolean;
  existingCustomerQuantityOnShow: number;
  newRequestQuantity: number;
  customerShowCap: number;
}

/** Pure representation of the authoritative invariants re-evaluated from fresh transaction reads. */
export function getPortalQueueTransactionBlockReason({
  requestHasExistingAllocation,
  existingCustomerQuantityOnShow,
  newRequestQuantity,
  customerShowCap,
}: PortalQueueTransactionEligibilityInput): PortalQueueTransactionBlockReason | null {
  if (requestHasExistingAllocation) {
    return "request_already_allocated";
  }
  return existingCustomerQuantityOnShow + newRequestQuantity > customerShowCap
    ? "customer_show_cap_exceeded"
    : null;
}
