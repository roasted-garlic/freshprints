import type { GangSheetSectionPricingConfig } from "@fresh-prints/shared/constants/gangSheetSectionPricingSettings.constants";
import type { ShowAllocation } from "@fresh-prints/shared/types/showAllocation/showAllocation.types";
import {
  calculateShowAllocationTotalPriceUsd,
  type ShowQueueAllocationPricingInput,
  type ShowQueuePrintRequestItemPricingInput,
} from "@fresh-prints/shared/utils/showAllocationDollarTotals";
import {
  filterCurrentShowAllocations,
} from "@fresh-prints/shared/utils/showAllocationSummaries";

export interface ShowAllocationPriceUnitInput {
  printWidthInches?: number;
  printHeightInches?: number;
  allocatedQuantity: number;
  status: string;
  pricingSnapshot?: ShowAllocation["pricingSnapshot"];
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

  const pricingItems = new Map<string, ShowQueuePrintRequestItemPricingInput>();
  const pricingAllocations: ShowQueueAllocationPricingInput[] = activeAllocations.map((allocation, index) => {
    const itemId = `studio-allocation-${index}`;
    pricingItems.set(itemId, {
      id: itemId,
      quantity: 1,
      printWidthInches: allocation.printWidthInches,
      // Studio's historical fallback treats a missing height as one inch.
      printHeightInches:
        typeof allocation.printHeightInches === "number" &&
        Number.isFinite(allocation.printHeightInches) &&
        allocation.printHeightInches > 0
          ? allocation.printHeightInches
          : 1,
    });
    return {
      status: allocation.status,
      allocatedQuantity: allocation.allocatedQuantity,
      printRequestItemId: itemId,
      pricingSnapshot: allocation.pricingSnapshot,
    };
  });

  return calculateShowAllocationTotalPriceUsd(pricingAllocations, pricingItems, pricing);
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
