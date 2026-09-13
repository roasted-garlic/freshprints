import {
  resolveEffectivePrintRequestLimits,
  type EffectivePrintRequestLimits,
} from "../../../packages/shared/src/utils/printRequestQuotaOverride";
import { adminDb } from "./admin";
import { loadPrintRequestLimitSettings } from "./loadPrintRequestLimitSettings";

export async function loadEffectivePrintRequestLimitsForCustomer(
  customerId: string,
  nowMs: number = Date.now(),
): Promise<EffectivePrintRequestLimits> {
  const [settings, customerSnap] = await Promise.all([
    loadPrintRequestLimitSettings(),
    adminDb.collection("customers").doc(customerId).get(),
  ]);
  const override = customerSnap.exists ? customerSnap.data()?.printRequestQuotaOverride : undefined;
  return resolveEffectivePrintRequestLimits({
    settings,
    override,
    nowMs,
  });
}
