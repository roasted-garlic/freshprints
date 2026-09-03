import type { EffectivePrintRequestLimits } from "@fresh-prints/shared/utils/printRequestQuotaOverride";
import { callTracedFunction } from "../../../config/tracedCallable";

export interface UpdateCustomerPrintRequestQuotaOverrideInput {
  customerId: string;
  clearAll?: boolean;
  maxQuantityPerPrintRequest?: number | null;
  maxQuantityPerShowPerCustomer?: number | null;
  expiresAtMs?: number | null;
}

export interface UpdateCustomerPrintRequestQuotaOverrideResult {
  customerId: string;
  effective: EffectivePrintRequestLimits;
}

export const customerPrintRequestQuotaOverrideService = {
  async update(
    input: UpdateCustomerPrintRequestQuotaOverrideInput,
  ): Promise<UpdateCustomerPrintRequestQuotaOverrideResult> {
    return callTracedFunction<
      UpdateCustomerPrintRequestQuotaOverrideInput,
      UpdateCustomerPrintRequestQuotaOverrideResult
    >("updateCustomerPrintRequestQuotaOverride", {
      source: "customerPrintRequestQuotaOverrideService.update",
    })({
      customerId: input.customerId,
      clearAll: input.clearAll === true ? true : undefined,
      maxQuantityPerPrintRequest: input.clearAll ? undefined : input.maxQuantityPerPrintRequest,
      maxQuantityPerShowPerCustomer: input.clearAll
        ? undefined
        : input.maxQuantityPerShowPerCustomer,
      expiresAtMs: input.clearAll ? undefined : input.expiresAtMs ?? null,
    });
  },
};
