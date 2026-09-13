import type { PrintRequestItem } from "../types/printRequest/printRequest.types";

export type PrintRequestItemArtworkEnhanceDocumentFields = Pick<
  PrintRequestItem,
  "artworkEnhanceMode" | "preEnhancePrintWidthInches" | "preEnhancePrintHeightInches"
>;

export function readPrintRequestItemArtworkEnhanceFields(data: {
  artworkEnhanceMode?: unknown;
  preEnhancePrintWidthInches?: unknown;
  preEnhancePrintHeightInches?: unknown;
}): PrintRequestItemArtworkEnhanceDocumentFields {
  return {
    ...(data.artworkEnhanceMode === "baseline" || data.artworkEnhanceMode === "enhanced"
      ? { artworkEnhanceMode: data.artworkEnhanceMode }
      : {}),
    ...(typeof data.preEnhancePrintWidthInches === "number"
      ? { preEnhancePrintWidthInches: data.preEnhancePrintWidthInches }
      : {}),
    ...(typeof data.preEnhancePrintHeightInches === "number"
      ? { preEnhancePrintHeightInches: data.preEnhancePrintHeightInches }
      : {}),
  };
}

/**
 * Partial size/quantity updates must not erase persisted artwork-enhance selection when a
 * mapper or reconciliation path omits optional enhancement fields.
 */
export function mergePrintRequestItemPreservingArtworkEnhanceFields(
  previous: PrintRequestItemArtworkEnhanceDocumentFields,
  next: PrintRequestItem,
): PrintRequestItem {
  return {
    ...next,
    artworkEnhanceMode: next.artworkEnhanceMode ?? previous.artworkEnhanceMode,
    preEnhancePrintWidthInches:
      next.preEnhancePrintWidthInches ?? previous.preEnhancePrintWidthInches,
    preEnhancePrintHeightInches:
      next.preEnhancePrintHeightInches ?? previous.preEnhancePrintHeightInches,
  };
}
