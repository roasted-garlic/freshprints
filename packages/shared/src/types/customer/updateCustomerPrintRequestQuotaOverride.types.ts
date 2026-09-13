/**
 * Owner callable request/response for customer print-request quota overrides.
 */

import type { EffectivePrintRequestLimits } from "../../utils/printRequestQuotaOverride";

export interface UpdateCustomerPrintRequestQuotaOverrideRequest {
  customerId: string;
  /** When true, removes the entire override map. */
  clearAll?: boolean;
  /** Null = use global for this dimension. Required on Save (non-clear). */
  maxQuantityPerPrintRequest?: number | null;
  maxQuantityPerShowPerCustomer?: number | null;
  /** Epoch ms; null = no expiration. */
  expiresAtMs?: number | null;
  /** Alternative to expiresAtMs. */
  expiresAtIso?: string | null;
}

export interface UpdateCustomerPrintRequestQuotaOverrideResponse {
  customerId: string;
  effective: EffectivePrintRequestLimits;
}
