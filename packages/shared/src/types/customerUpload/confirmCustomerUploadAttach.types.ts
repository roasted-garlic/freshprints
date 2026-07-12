/** Attach callable DTOs (Sub-phase C). */

export const CUSTOMER_UPLOAD_ATTACH_QUANTITY_MIN = 1;
/** Portal item card has no UI max; server caps abuse. */
export const CUSTOMER_UPLOAD_ATTACH_QUANTITY_MAX = 100_000;

export interface ConfirmCustomerUploadsAndAttachToRequestRequest {
  batchId: string;
  uploadIds: string[];
  ownershipConfirmed: true;
  /** Optional library permission; default UI is checked but attach must not require true. */
  catalogUseAcknowledged: boolean;
  termsVersion: string;
  defaultQuantity?: number;
}

export interface ConfirmCustomerUploadsAndAttachToRequestResponse {
  printRequestId: string;
  attachedItemIds: string[];
  reusedItemIds: string[];
}
