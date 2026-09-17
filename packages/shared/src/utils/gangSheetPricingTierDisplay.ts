import type {
  GangSheetLengthPricingTier,
  GangSheetPricingTier,
} from "../constants/gangSheetSectionPricingSettings.constants";

/** Customer-facing tier names (Studio + Portal). */
export const GANG_SHEET_PRICING_TIER_LABELS: Record<GangSheetPricingTier, string> = {
  pocket: "Pocket",
  standard_full_size: "Standard Full Size",
  standard_oversized: "Standard Oversized",
  extra_oversized: "Extra Oversized",
};

/** Width bands for each pricing tier (product policy). */
export const GANG_SHEET_PRICING_TIER_SIZE_RANGES: Record<GangSheetPricingTier, string> = {
  pocket: '4" and under',
  standard_full_size: 'over 4" through 11"',
  standard_oversized: 'over 11" through 14"',
  extra_oversized: 'over 14"',
};

/** Customer-facing length surcharge names (Studio + Portal). */
export const GANG_SHEET_LENGTH_TIER_LABELS: Record<GangSheetLengthPricingTier, string> = {
  standard_length: "Standard Length",
  long: "Long",
  extra_long: "Extra Long",
  extended: "Extended",
};

/** Height bands for each length surcharge tier (product policy). */
export const GANG_SHEET_LENGTH_TIER_SIZE_RANGES: Record<GangSheetLengthPricingTier, string> = {
  standard_length: 'up to 14"',
  long: 'over 14" through 18"',
  extra_long: 'over 18" through 24"',
  extended: 'over 24"',
};
