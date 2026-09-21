import type { PrintRequestItem } from "@fresh-prints/shared/types/printRequest/printRequest.types";

const MAX_EXPORT_QUANTITY = 999;

/** Local-only selection state for direct gang-sheet export. It never updates the request. */
export function buildPrintRequestGangSheetSelection(items: readonly PrintRequestItem[]): Set<string> {
  return new Set(items.map((item) => item.id));
}

/** Default export quantities mirror saved request quantities. */
export function buildPrintRequestGangSheetExportQuantities(
  items: readonly PrintRequestItem[],
): Map<string, number> {
  return new Map(items.map((item) => [item.id, normalizeExportQuantity(item.quantity, item.quantity)]));
}

export function normalizeExportQuantity(raw: unknown, fallbackQuantity: number): number {
  const fallback =
    typeof fallbackQuantity === "number" && Number.isInteger(fallbackQuantity) && fallbackQuantity > 0
      ? Math.min(fallbackQuantity, MAX_EXPORT_QUANTITY)
      : 1;
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return fallback;
  }
  const rounded = Math.trunc(raw);
  if (rounded < 1) {
    return 1;
  }
  return Math.min(rounded, MAX_EXPORT_QUANTITY);
}

/** Removes IDs that are no longer present while preserving the current item order at export time. */
export function resolvePrintRequestGangSheetSelection(
  items: readonly PrintRequestItem[],
  selectedItemIds: ReadonlySet<string>,
): PrintRequestItem[] {
  return items.filter((item) => selectedItemIds.has(item.id));
}

/**
 * Builds the Generate snapshot: selected items with export-only quantity overrides.
 * Never mutates the original request item objects.
 */
export function resolvePrintRequestGangSheetExportItems(
  items: readonly PrintRequestItem[],
  selectedItemIds: ReadonlySet<string>,
  exportQuantities: ReadonlyMap<string, number>,
): PrintRequestItem[] {
  return resolvePrintRequestGangSheetSelection(items, selectedItemIds).map((item) => {
    const quantity = normalizeExportQuantity(exportQuantities.get(item.id), item.quantity);
    if (quantity === item.quantity) {
      return item;
    }
    return { ...item, quantity };
  });
}

export function sumPrintRequestGangSheetExportQuantity(
  items: readonly PrintRequestItem[],
  selectedItemIds: ReadonlySet<string>,
  exportQuantities: ReadonlyMap<string, number>,
): number {
  return resolvePrintRequestGangSheetExportItems(items, selectedItemIds, exportQuantities).reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
}

export function getPrintRequestGangSheetItemLabel(item: PrintRequestItem): string {
  const snapshot = item.titleSnapshot?.trim();
  if (snapshot) {
    return snapshot;
  }
  if (item.sourceType === "customer_upload" || item.customerUploadId) {
    return "Uploaded artwork";
  }
  if (item.sourceType === "staff_artwork" || item.staffArtworkId) {
    return "Staff Artwork";
  }
  return "Catalog design";
}

export function mergePrintRequestGangSheetExportQuantities(
  items: readonly PrintRequestItem[],
  previous: ReadonlyMap<string, number>,
): Map<string, number> {
  const next = new Map<string, number>();
  for (const item of items) {
    next.set(item.id, normalizeExportQuantity(previous.get(item.id), item.quantity));
  }
  return next;
}
