import { resolveGangSheetPriceTierForInches } from "./gangSheetCustomerSectionSummary";

/**
 * Operational size-class count input (Print Request items or Show Allocations).
 * Classification is WIDTH-ONLY and follows the canonical four-tier gang-sheet pricing policy.
 */
export interface PrintRequestSizeClassCountInput {
  printWidthInches?: number | null;
  /** Ignored for size classification; accepted so callers can pass full item rows. */
  printHeightInches?: number | null;
  /** Print quantity (item.quantity or allocation.allocatedQuantity). */
  quantity: number;
  /** When present, `canceled` rows are excluded. */
  status?: string | null;
}

export interface PrintRequestSizeClassCounts {
  pocketCount: number;
  standardFullSizeCount: number;
  standardOversizedCount: number;
  extraOversizedCount: number;
}

function isPositiveFiniteInches(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isPositiveFiniteQuantity(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/**
 * Operational four-tier print-quantity counts for Studio cards.
 *
 * WIDTH-ONLY product rule:
 * - Pocket: printWidthInches <= 4
 * - Reg Full: printWidthInches <= 11
 * - Reg Oversize: printWidthInches <= 14
 * - Ext Oversize: printWidthInches > 14
 *
 * Height does not participate. Classification is shared with
 * `resolveGangSheetPriceTierForInches` so compact cards stay current with gang-sheet pricing.
 */
export function resolvePrintRequestSizeClassCounts(
  rows: readonly PrintRequestSizeClassCountInput[],
): PrintRequestSizeClassCounts {
  let pocketCount = 0;
  let standardFullSizeCount = 0;
  let standardOversizedCount = 0;
  let extraOversizedCount = 0;

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

    switch (resolveGangSheetPriceTierForInches(row.printWidthInches)) {
      case "pocket":
        pocketCount += quantity;
        break;
      case "standard_full_size":
        standardFullSizeCount += quantity;
        break;
      case "standard_oversized":
        standardOversizedCount += quantity;
        break;
      case "extra_oversized":
        extraOversizedCount += quantity;
        break;
    }
  }

  return { pocketCount, standardFullSizeCount, standardOversizedCount, extraOversizedCount };
}

const SIZE_CLASS_LABELS: ReadonlyArray<{
  key: keyof PrintRequestSizeClassCounts;
  label: string;
}> = [
  { key: "pocketCount", label: "Pocket" },
  { key: "standardFullSizeCount", label: "Reg Full" },
  { key: "standardOversizedCount", label: "Reg Oversize" },
  { key: "extraOversizedCount", label: "Ext Oversize" },
];

/** Compact Studio label, or `null` when all counts are zero (hide empty summary). */
export function formatPrintRequestSizeClassCountsLabel(
  counts: PrintRequestSizeClassCounts,
): string | null {
  const parts = SIZE_CLASS_LABELS
    .filter(({ key }) => counts[key] > 0)
    .map(({ key, label }) => `${label} ${counts[key]}`);
  if (parts.length === 0) {
    return null;
  }
  return parts.join(" · ");
}

/** @deprecated Use PrintRequestSizeClassCountInput. */
export type PrintRequestPocketFullSizeCountInput = PrintRequestSizeClassCountInput;

/** @deprecated Use PrintRequestSizeClassCounts. */
export type PrintRequestPocketFullSizeCounts = PrintRequestSizeClassCounts;

/** @deprecated Use resolvePrintRequestSizeClassCounts. The cutoff is ignored. */
export function resolvePrintRequestPocketFullSizeCounts(
  rows: readonly PrintRequestSizeClassCountInput[],
  _legacyCutoffInches?: number,
): PrintRequestSizeClassCounts {
  void _legacyCutoffInches;
  return resolvePrintRequestSizeClassCounts(rows);
}

/** @deprecated Use formatPrintRequestSizeClassCountsLabel. */
export function formatPocketFullSizeCountsLabel(
  counts: PrintRequestSizeClassCounts,
): string | null {
  return formatPrintRequestSizeClassCountsLabel(counts);
}
