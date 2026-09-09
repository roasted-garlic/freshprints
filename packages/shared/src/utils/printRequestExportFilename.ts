import { formatInchesForFilename, sanitizeFilenameSegment } from "./showExportFilename";

export function buildPrintRequestExportZipFilename(requestName: string): string {
  return `${sanitizeFilenameSegment(requestName)}.zip`;
}

export function buildPrintRequestExportImageFilename(input: {
  sequenceNumber: number;
  quantity: number;
  printWidthInches: number;
  printHeightInches: number;
  designTitle: string;
  itemId: string;
}): string {
  const sequence = String(input.sequenceNumber).padStart(3, "0");
  const size = `${formatInchesForFilename(input.printWidthInches)}x${formatInchesForFilename(input.printHeightInches)}`;
  return `${sequence}_QTY-${input.quantity}_${size}_${sanitizeFilenameSegment(input.designTitle)}_item-${sanitizeFilenameSegment(input.itemId.slice(0, 12))}.png`;
}

export function buildPrintRequestGangSheetBaseFileName(requestName: string): string {
  return `${sanitizeFilenameSegment(requestName)}_gang-sheet`;
}

export function buildPrintRequestGangSheetCacheScope(requestId: string): string {
  return `print-request:${requestId.trim()}`;
}
