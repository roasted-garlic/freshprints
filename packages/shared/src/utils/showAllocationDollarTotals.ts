import type { GangSheetSectionPricingConfig } from "../constants/gangSheetSectionPricingSettings.constants";
import { resolveGangSheetPriceBreakdownForDimensions } from "./gangSheetCustomerSectionSummary";

export interface ShowQueuePrintRequestItemPricingInput {
  id: string;
  quantity: unknown;
  printWidthInches?: unknown;
  printHeightInches?: unknown;
}

export interface ShowQueueAllocationPricingInput {
  status: unknown;
  allocatedQuantity: unknown;
  printRequestItemId?: unknown;
  pricingSnapshot?: unknown;
}

function roundUsd(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function positiveWholeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

function positiveFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function readDimensions(item: ShowQueuePrintRequestItemPricingInput): {
  printWidthInches: number;
  printHeightInches: number;
} | null {
  const printWidthInches = positiveFiniteNumber(item.printWidthInches);
  const printHeightInches = positiveFiniteNumber(item.printHeightInches);
  return printWidthInches !== null && printHeightInches !== null
    ? { printWidthInches, printHeightInches }
    : null;
}

function readSnapshotUnitPriceUsd(value: unknown): number | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const unitPriceUsd = (value as { unitPriceUsd?: unknown }).unitPriceUsd;
  return typeof unitPriceUsd === "number" && Number.isFinite(unitPriceUsd) && unitPriceUsd >= 0
    ? unitPriceUsd
    : null;
}

/**
 * Prices every saved request item with the current canonical width/length policy.
 * A missing or malformed row is explicitly unpriceable rather than silently zero.
 */
export function calculatePrintRequestTotalPriceUsd(
  items: readonly ShowQueuePrintRequestItemPricingInput[],
  pricing: GangSheetSectionPricingConfig,
): number | null {
  if (items.length === 0) {
    return null;
  }

  let total = 0;
  for (const item of items) {
    const quantity = positiveWholeNumber(item.quantity);
    const dimensions = readDimensions(item);
    if (quantity === null || dimensions === null) {
      return null;
    }
    try {
      total += resolveGangSheetPriceBreakdownForDimensions(
        dimensions.printWidthInches,
        dimensions.printHeightInches,
        pricing,
        quantity,
      ).lineTotalUsd;
    } catch {
      return null;
    }
  }
  return roundUsd(total);
}

/**
 * Prices the active allocations for one selected-show request. Immutable allocation
 * snapshots are authoritative; legacy rows fall back to the saved request-item size.
 */
export function calculateShowAllocationTotalPriceUsd(
  allocations: readonly ShowQueueAllocationPricingInput[],
  itemsById: ReadonlyMap<string, ShowQueuePrintRequestItemPricingInput>,
  pricing: GangSheetSectionPricingConfig,
): number | null {
  const activeAllocations = allocations.filter((allocation) => allocation.status !== "canceled");
  if (activeAllocations.length === 0) {
    return null;
  }

  let total = 0;
  for (const allocation of activeAllocations) {
    const quantity = positiveWholeNumber(allocation.allocatedQuantity);
    const itemId = typeof allocation.printRequestItemId === "string" ? allocation.printRequestItemId.trim() : "";
    if (quantity === null) {
      return null;
    }

    const snapshotUnitPriceUsd = readSnapshotUnitPriceUsd(allocation.pricingSnapshot);
    if (snapshotUnitPriceUsd !== null) {
      total += snapshotUnitPriceUsd * quantity;
      continue;
    }

    const item = itemId ? itemsById.get(itemId) : undefined;
    if (!item) {
      return null;
    }

    const dimensions = readDimensions(item);
    if (dimensions === null) {
      return null;
    }
    try {
      total += resolveGangSheetPriceBreakdownForDimensions(
        dimensions.printWidthInches,
        dimensions.printHeightInches,
        pricing,
        quantity,
      ).lineTotalUsd;
    } catch {
      return null;
    }
  }
  return roundUsd(total);
}
