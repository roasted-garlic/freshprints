import type { GangSheetSectionPricingConfig } from "../constants/gangSheetSectionPricingSettings.constants";
import type { ShowAllocationPricingSnapshot } from "../types/showAllocation/showAllocationPricing.types";
import { resolveGangSheetPriceBreakdownForDimensions } from "./gangSheetCustomerSectionSummary";

export function buildGangSheetPricingSnapshot(input: {
  printWidthInches?: unknown;
  printHeightInches?: unknown;
  pricing: GangSheetSectionPricingConfig;
}): ShowAllocationPricingSnapshot | undefined {
  if (
    typeof input.printWidthInches !== "number" ||
    typeof input.printHeightInches !== "number" ||
    !Number.isFinite(input.printWidthInches) ||
    !Number.isFinite(input.printHeightInches) ||
    input.printWidthInches <= 0 ||
    input.printHeightInches <= 0
  ) {
    return undefined;
  }

  const breakdown = resolveGangSheetPriceBreakdownForDimensions(
    input.printWidthInches,
    input.printHeightInches,
    input.pricing,
  );
  return {
    policyVersion: input.pricing.policyVersion,
    widthTier: breakdown.widthTier,
    basePriceUsd: breakdown.basePriceUsd,
    lengthTier: breakdown.lengthTier,
    lengthSurchargeUsd: breakdown.lengthSurchargeUsd,
    unitPriceUsd: breakdown.unitPriceUsd,
  };
}
