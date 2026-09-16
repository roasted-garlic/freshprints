import { resolvePrintRequestItemIdentity } from "./printRequestItemSource";

export interface PrintRequestItemSummary {
  totalQuantity: number;
  uniqueDesignCount: number;
  /** Eligible width-tier rows for existing pricing/tier consumers. */
  sizeClassRows: Array<{
    printWidthInches: number;
    quantity: number;
  }>;
}

/**
 * Summarize request line items. Source-backed items count by their namespaced
 * artwork identity, while quantity always comes from the current item row.
 */
export function buildPrintRequestItemSummaries(
  items: Array<{
    printRequestId: string;
    sourceType?: "catalog_design" | "customer_upload" | "staff_artwork";
    designId?: string;
    customerUploadId?: string;
    staffArtworkId?: string;
    id: string;
    quantity: number;
    printWidthInches?: number;
    printHeightInches?: number;
    status?: string;
  }>,
): Record<string, PrintRequestItemSummary> {
  const uniqueKeysByRequestId = new Map<string, Set<string>>();
  const totalQuantityByRequestId = new Map<string, number>();
  const sizeClassRowsByRequestId = new Map<string, Array<{ printWidthInches: number; quantity: number }>>();

  for (const item of items) {
    if (!uniqueKeysByRequestId.has(item.printRequestId)) {
      uniqueKeysByRequestId.set(item.printRequestId, new Set<string>());
    }

    const uniqueKey = resolvePrintRequestItemIdentity(item);

    uniqueKeysByRequestId.get(item.printRequestId)?.add(uniqueKey);

    const quantity = Number.isFinite(item.quantity) ? item.quantity : 0;
    totalQuantityByRequestId.set(
      item.printRequestId,
      (totalQuantityByRequestId.get(item.printRequestId) ?? 0) + quantity,
    );

    if (
      Number.isFinite(item.quantity) &&
      item.quantity > 0 &&
      typeof item.printWidthInches === "number" &&
      Number.isFinite(item.printWidthInches) &&
      item.printWidthInches > 0
    ) {
      const rows = sizeClassRowsByRequestId.get(item.printRequestId) ?? [];
      rows.push({ printWidthInches: item.printWidthInches, quantity: item.quantity });
      sizeClassRowsByRequestId.set(item.printRequestId, rows);
    }
  }

  return Object.fromEntries(
    [...uniqueKeysByRequestId.entries()].map(([printRequestId, uniqueKeys]) => [
      printRequestId,
      {
        totalQuantity: totalQuantityByRequestId.get(printRequestId) ?? 0,
        uniqueDesignCount: uniqueKeys.size,
        sizeClassRows: sizeClassRowsByRequestId.get(printRequestId) ?? [],
      },
    ]),
  );
}
