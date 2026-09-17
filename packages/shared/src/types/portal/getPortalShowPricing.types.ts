import type { GangSheetSectionPricingConfig } from "../../constants/gangSheetSectionPricingSettings.constants";

export interface GetPortalShowPricingResponse {
  /** Normalized customer-safe projection; raw settings fields are never returned. */
  sectionPricing: GangSheetSectionPricingConfig;
}
