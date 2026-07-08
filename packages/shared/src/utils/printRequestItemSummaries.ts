export interface PrintRequestItemSummary {
  totalQuantity: number;
  uniqueDesignCount: number;
}

export function buildPrintRequestItemSummaries(
  items: Array<{ printRequestId: string; designId: string; quantity: number }>,
): Record<string, PrintRequestItemSummary> {
  const designIdsByRequestId = new Map<string, Set<string>>();
  const totalQuantityByRequestId = new Map<string, number>();

  for (const item of items) {
    if (!designIdsByRequestId.has(item.printRequestId)) {
      designIdsByRequestId.set(item.printRequestId, new Set<string>());
    }

    designIdsByRequestId.get(item.printRequestId)?.add(item.designId);

    const quantity = Number.isFinite(item.quantity) ? item.quantity : 0;
    totalQuantityByRequestId.set(
      item.printRequestId,
      (totalQuantityByRequestId.get(item.printRequestId) ?? 0) + quantity,
    );
  }

  return Object.fromEntries(
    [...designIdsByRequestId.entries()].map(([printRequestId, designIds]) => [
      printRequestId,
      {
        totalQuantity: totalQuantityByRequestId.get(printRequestId) ?? 0,
        uniqueDesignCount: designIds.size,
      },
    ]),
  );
}
