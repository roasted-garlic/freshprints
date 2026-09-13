/**
 * Optional temporary Portal print-request / customer-show quota override.
 * Persisted on `customers/{customerId}.printRequestQuotaOverride`.
 * Written only by owner Admin callable; clients must not mutate.
 */
export interface PrintRequestQuotaOverride {
  /** Null/absent = use global for this dimension. */
  maxQuantityPerPrintRequest?: number | null;
  /** Null/absent = use global for this dimension. */
  maxQuantityPerShowPerCustomer?: number | null;
  /** Null/absent = no expiration (manual clear only). */
  expiresAt?: unknown | null;
  updatedAt?: unknown;
  updatedBy?: string;
}
