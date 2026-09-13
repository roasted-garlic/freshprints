import { DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG } from '@fresh-prints/shared/constants/gangSheetSectionPricingSettings.constants';
import type { PrintRequestItem } from '@fresh-prints/shared/types/printRequest/printRequest.types';
import {
  calculateGangSheetCustomerSectionSummary,
  type GangSheetCustomerSectionSummary,
} from '@fresh-prints/shared/utils/gangSheetCustomerSectionSummary';

/**
 * Estimate show-commitment pricing from request items using shared default tier rates.
 * Returns null when there are no priced units or widths are invalid.
 */
export function buildPortalShowPriceCommitmentSummary(
  items: readonly PrintRequestItem[],
  quantityForItem?: (item: PrintRequestItem) => number,
): GangSheetCustomerSectionSummary | null {
  const units = items
    .map((item) => {
      const quantity = quantityForItem ? quantityForItem(item) : item.quantity;
      return {
        printWidthInches: item.printWidthInches ?? Number.NaN,
        printHeightInches: item.printHeightInches ?? 1,
        quantity,
      };
    })
    .filter((unit) => Number.isInteger(unit.quantity) && unit.quantity > 0);

  if (units.length === 0) {
    return null;
  }

  try {
    return calculateGangSheetCustomerSectionSummary(
      units,
      DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG,
    );
  } catch {
    return null;
  }
}

export function formatPortalShowPriceUsd(amount: number): string {
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}
