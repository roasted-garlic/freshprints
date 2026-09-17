import type {
  GangSheetLengthPricingTier,
  GangSheetPricingTier,
} from "../../constants/gangSheetSectionPricingSettings.constants";

/** Immutable customer-facing unit pricing captured when an allocation is created. */
export interface ShowAllocationPricingSnapshot {
  policyVersion: string;
  widthTier: GangSheetPricingTier;
  basePriceUsd: number;
  lengthTier: GangSheetLengthPricingTier;
  lengthSurchargeUsd: number;
  unitPriceUsd: number;
}
