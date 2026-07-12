export interface PrintRequestItemSummary {
  totalQuantity: number;
  uniqueDesignCount: number;
}

/**
 * Summarize request line items. Upload-backed items (no designId) still count
 * toward totals using customerUploadId or item identity when present.
 */
export function buildPrintRequestItemSummaries(
  items: Array<{
    printRequestId: string;
    designId?: string;
    customerUploadId?: string;
    id?: string;
    quantity: number;
  }>,
): Record<string, PrintRequestItemSummary> {
  const uniqueKeysByRequestId = new Map<string, Set<string>>();
  const totalQuantityByRequestId = new Map<string, number>();

  for (const item of items) {
    if (!uniqueKeysByRequestId.has(item.printRequestId)) {
      uniqueKeysByRequestId.set(item.printRequestId, new Set<string>());
    }

    const uniqueKey =
      (typeof item.designId === "string" && item.designId.trim()) ||
      (typeof item.customerUploadId === "string" && item.customerUploadId.trim()) ||
      (typeof item.id === "string" && item.id.trim()) ||
      `qty:${item.printRequestId}:${item.quantity}`;

    uniqueKeysByRequestId.get(item.printRequestId)?.add(uniqueKey);

    const quantity = Number.isFinite(item.quantity) ? item.quantity : 0;
    totalQuantityByRequestId.set(
      item.printRequestId,
      (totalQuantityByRequestId.get(item.printRequestId) ?? 0) + quantity,
    );
  }

  return Object.fromEntries(
    [...uniqueKeysByRequestId.entries()].map(([printRequestId, uniqueKeys]) => [
      printRequestId,
      {
        totalQuantity: totalQuantityByRequestId.get(printRequestId) ?? 0,
        uniqueDesignCount: uniqueKeys.size,
      },
    ]),
  );
}
