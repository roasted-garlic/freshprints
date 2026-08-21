/**
 * Requested print inches for queued/export production.
 * Allocation snapshot first, then the print-request item. Never substitute
 * catalog/upload native inches, 1″, or the old 3″ export default.
 */
export function resolveQueuedPrintInches(input: {
  allocationWidthInches?: number | null;
  allocationHeightInches?: number | null;
  itemWidthInches?: number | null;
  itemHeightInches?: number | null;
}): { printWidthInches: number; printHeightInches: number } {
  const width = pickPositiveInches(input.allocationWidthInches) ?? pickPositiveInches(input.itemWidthInches);
  const height =
    pickPositiveInches(input.allocationHeightInches) ?? pickPositiveInches(input.itemHeightInches);

  if (width === undefined || height === undefined) {
    throw new Error(
      "This queued item is missing requested print size. Re-save the Print Request size, then try again.",
    );
  }

  return { printWidthInches: width, printHeightInches: height };
}

function pickPositiveInches(value: number | null | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return value;
}
