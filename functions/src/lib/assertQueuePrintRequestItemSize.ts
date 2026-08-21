import { requireSavablePrintRequestItemSize } from "../../../packages/shared/src/utils/printRequestItemSizing";

export function assertQueuePrintRequestItemSize(input: {
  printWidthInches?: number;
  printHeightInches?: number;
  pixelWidth?: number;
  pixelHeight?: number;
}): { printWidthInches: number; printHeightInches: number } {
  const printWidthInches = input.printWidthInches;
  const printHeightInches = input.printHeightInches;
  if (
    typeof printWidthInches !== "number" ||
    typeof printHeightInches !== "number" ||
    !Number.isFinite(printWidthInches) ||
    !Number.isFinite(printHeightInches) ||
    printWidthInches <= 0 ||
    printHeightInches <= 0
  ) {
    throw new Error("This print request item is missing a requested print size.");
  }

  if (
    typeof input.pixelWidth !== "number" ||
    typeof input.pixelHeight !== "number" ||
    input.pixelWidth <= 0 ||
    input.pixelHeight <= 0
  ) {
    throw new Error("Design pixel dimensions are required to validate requested size.");
  }

  requireSavablePrintRequestItemSize({
    pixelWidth: input.pixelWidth,
    pixelHeight: input.pixelHeight,
    printWidthInches,
    printHeightInches,
  });

  return { printWidthInches, printHeightInches };
}
