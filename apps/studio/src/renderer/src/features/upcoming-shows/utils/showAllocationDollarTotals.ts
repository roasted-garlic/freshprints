import type { GangSheetSectionPricingConfig } from "@fresh-prints/shared/constants/gangSheetSectionPricingSettings.constants";
import type { ShowAllocation } from "@fresh-prints/shared/types/showAllocation/showAllocation.types";
import { calculateGangSheetCustomerSectionSummary } from "@fresh-prints/shared/utils/gangSheetCustomerSectionSummary";
import {
  buildShowAllocationOperationalSummary,
  filterCurrentShowAllocations,
} from "@fresh-prints/shared/utils/showAllocationSummaries";

export interface ShowAllocationPriceUnitInput {
  printWidthInches?: number;
  printHeightInches?: number;
  allocatedQuantity: number;
  status: string;
}

/**
 * Dollar total for a show/sheet print-request group using active (non-canceled) allocations
 * and the shared gang-sheet section pricing ladder. Returns null when there are no active
 * allocations or pricing cannot be computed (e.g. missing print width).
 */
export function calculateShowAllocationGroupPriceUsd(
  allocations: ShowAllocationPriceUnitInput[],
  pricing: GangSheetSectionPricingConfig,
): number | null {
  const activeAllocations = filterCurrentShowAllocations(allocations);

  if (activeAllocations.length === 0) {
    return null;
  }

  // Keep pricing fail-closed for an active row with no usable width. The
  // operational summary and pricing therefore use the same active set.
  if (
    activeAllocations.some(
      (allocation) =>
        typeof allocation.printWidthInches !== "number" ||
        !Number.isFinite(allocation.printWidthInches) ||
        allocation.printWidthInches <= 0,
    )
  ) {
    return null;
  }

  const activeUnits = buildShowAllocationOperationalSummary(activeAllocations).pricingUnits;

  try {
    return calculateGangSheetCustomerSectionSummary(activeUnits, pricing).totalPriceUsd;
  } catch {
    return null;
  }
}

/** Sums priced groups; ignores null (unpriced / inactive-only) groups. */
export function sumShowAllocationGroupPricesUsd(prices: Array<number | null>): number {
  return prices.reduce<number>((sum, price) => (typeof price === "number" ? sum + price : sum), 0);
}

export function formatShowAllocationPriceUsd(amount: number): string {
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}

/** Convenience wrapper for typed ShowAllocation rows. */
export function calculateShowAllocationGroupPriceUsdFromAllocations(
  allocations: ShowAllocation[],
  pricing: GangSheetSectionPricingConfig,
): number | null {
  return calculateShowAllocationGroupPriceUsd(allocations, pricing);
}
