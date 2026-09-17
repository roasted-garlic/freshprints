import { onCall } from "firebase-functions/v2/https";

import type { GetPortalShowPricingResponse } from "../../packages/shared/src/types/portal/getPortalShowPricing.types";
import { resolveGangSheetSectionPricingFromSettings } from "../../packages/shared/src/constants/gangSheetSectionPricingSettings.constants";
import { adminDb } from "./lib/admin";

/** Customer-safe normalized projection of the current Show Queue pricing policy. */
export const getPortalShowPricing = onCall(async (): Promise<GetPortalShowPricingResponse> => {
  const snapshot = await adminDb.collection("settings").doc("showQueue").get();
  return {
    sectionPricing: resolveGangSheetSectionPricingFromSettings(snapshot.data() ?? {}),
  };
});
