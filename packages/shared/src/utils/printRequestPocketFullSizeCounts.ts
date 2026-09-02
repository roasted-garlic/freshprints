import { DEFAULT_GANG_SHEET_SECTION_PRICE_CUTOFF_INCHES } from "../constants/gangSheetSectionPricingSettings.constants";

/**
 * Operational Pocket / Full Size count input (Print Request items or Show Allocations).
 * Classification is WIDTH-ONLY — intentionally different from gang-sheet pricing tiers.
 */
export interface PrintRequestPocketFullSizeCountInput {
  printWidthInches?: number | null;
  /** Ignored for Pocket / Full Size classification; accepted so callers can pass full item rows. */
  printHeightInches?: number | null;
  /** Print quantity (item.quantity or allocation.allocatedQuantity). */
  quantity: number;
  /** When present, `canceled` rows are excluded. */
  status?: string | null;
}

export interface PrintRequestPocketFullSizeCounts {
  pocketCount: number;
  fullSizeCount: number;
}

function isPositiveFiniteInches(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isPositiveFiniteQuantity(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function resolveCutoffInches(sizeCutoffInches: number): number {
  return typeof sizeCutoffInches === "number" && Number.isFinite(sizeCutoffInches) && sizeCutoffInches > 0
    ? sizeCutoffInches
    : DEFAULT_GANG_SHEET_SECTION_PRICE_CUTOFF_INCHES;
}

/**
 * Operational Pocket / Full Size print-quantity counts for Studio cards.
 *
 * WIDTH-ONLY product rule (Owner QA 2026-09-02):
 * - Pocket: printWidthInches <= cutoff
 * - Full Size: printWidthInches > cutoff
 *
 * Height does not participate. This is intentionally separate from
 * `resolveGangSheetPriceTierForInches` / gang-sheet pricing-weight classification.
 */
export function resolvePrintRequestPocketFullSizeCounts(
  rows: readonly PrintRequestPocketFullSizeCountInput[],
  sizeCutoffInches: number,
): PrintRequestPocketFullSizeCounts {
  const cutoff = resolveCutoffInches(sizeCutoffInches);
  let pocketCount = 0;
  let fullSizeCount = 0;

  for (const row of rows) {
    if (row.status === "canceled") {
      continue;
    }
    if (!isPositiveFiniteQuantity(row.quantity)) {
      continue;
    }
    if (!isPositiveFiniteInches(row.printWidthInches)) {
      continue;
    }

    const quantity = Math.trunc(row.quantity);
    if (quantity <= 0) {
      continue;
    }

    if (row.printWidthInches <= cutoff) {
      pocketCount += quantity;
    } else {
      fullSizeCount += quantity;
    }
  }

  return { pocketCount, fullSizeCount };
}

/** Compact Studio label, or `null` when both counts are zero (hide empty summary). */
export function formatPocketFullSizeCountsLabel(
  counts: PrintRequestPocketFullSizeCounts,
): string | null {
  if (counts.pocketCount <= 0 && counts.fullSizeCount <= 0) {
    return null;
  }
  return `Pocket ${counts.pocketCount} · Full Size ${counts.fullSizeCount}`;
}
