import type { ExportGangSheetPngRequest } from "../types/export/gangSheetExportIpc.types";

/**
 * Builds a stable fingerprint for a gang sheet generate request so Studio can detect when the
 * local cache is stale (allocations or layout settings changed). Download URLs are omitted —
 * they rotate and must not affect cache identity.
 */
export function buildGangSheetCacheFingerprint(request: ExportGangSheetPngRequest): string {
  const includeSectionSummaryInputs =
    request.layoutMode === "grouped_by_customer" ||
    request.layoutMode === "customer_grouped_continuous";

  const images = request.images
    .map((image) => ({
      allocationId: image.allocationId,
      productionStoragePath: image.productionStoragePath,
      targetWidthPx: image.targetWidthPx,
      targetHeightPx: image.targetHeightPx,
      quantity: image.quantity,
      ...(includeSectionSummaryInputs && typeof image.printWidthInches === "number"
        ? { printWidthInches: image.printWidthInches }
        : {}),
      ...(includeSectionSummaryInputs && typeof image.printHeightInches === "number"
        ? { printHeightInches: image.printHeightInches }
        : {}),
    }))
    .sort((left, right) => left.allocationId.localeCompare(right.allocationId));

  const payload = JSON.stringify({
    baseFileName: request.baseFileName,
    sheetWidthInches: request.sheetWidthInches,
    sideMarginInches: request.sideMarginInches,
    topBottomMarginInches: request.topBottomMarginInches,
    gutterInches: request.gutterInches,
    maxSheetLengthInches: request.maxSheetLengthInches,
    labelFontSizePx: request.labelFontSizePx,
    ...(request.layoutMode && request.layoutMode !== "efficiency"
      ? {
          layoutMode: request.layoutMode,
          sectionSummaryVersion: 2,
          ...(request.sectionPricing ? { sectionPricing: request.sectionPricing } : {}),
        }
      : {}),
    images,
  });

  return djb2Hex(payload);
}

/** Filename-safe show id segment for cache directories. */
export function sanitizeGangSheetCacheShowId(showId: string): string {
  const sanitized = showId
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 120);

  return sanitized || "show";
}

function djb2Hex(value: string): string {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}
