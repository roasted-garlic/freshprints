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
  const includeRequestSummaryInputs = Boolean(request.cacheScope?.startsWith("print-request:") && request.sectionPricing);
  const includePricingInputs = includeSectionSummaryInputs || includeRequestSummaryInputs;

  const images = request.images
    .map((image) => ({
      assetId: image.requestItemId ?? image.allocationId ?? "",
      productionStoragePath: image.productionStoragePath,
      targetWidthPx: image.targetWidthPx,
      targetHeightPx: image.targetHeightPx,
      quantity: image.quantity,
      ...(includePricingInputs && typeof image.printWidthInches === "number"
        ? { printWidthInches: image.printWidthInches }
        : {}),
      ...(includePricingInputs && typeof image.printHeightInches === "number"
        ? { printHeightInches: image.printHeightInches }
        : {}),
    }))
    .sort((left, right) => left.assetId.localeCompare(right.assetId));

  const payload = JSON.stringify({
    baseFileName: request.baseFileName,
    sheetWidthInches: request.sheetWidthInches,
    sideMarginInches: request.sideMarginInches,
    topBottomMarginInches: request.topBottomMarginInches,
    gutterInches: request.gutterInches,
    maxSheetLengthInches: request.maxSheetLengthInches,
    labelFontSizePx: request.labelFontSizePx,
    ...(request.sheetLabel ? { sheetLabel: request.sheetLabel } : {}),
    ...(request.cacheScope ? { cacheScope: request.cacheScope } : {}),
    ...(request.layoutMode && request.layoutMode !== "efficiency"
      ? { layoutMode: request.layoutMode }
      : {}),
    ...(request.sectionPricing
      ? { sectionSummaryVersion: 3, sectionPricing: request.sectionPricing }
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
