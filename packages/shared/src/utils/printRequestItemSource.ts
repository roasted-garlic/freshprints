import type {
  PrintRequestItem,
  PrintRequestItemSourceType,
} from "../types/printRequest/printRequest.types";

export type PrintRequestItemSourceFields = Pick<
  PrintRequestItem,
  "sourceType" | "designId" | "customerUploadId" | "staffArtworkId" | "sourceLabel"
>;

/**
 * Resolves item provenance.
 * Explicit `sourceType` wins when set. Legacy docs without `sourceType` fall back to
 * identity IDs (`staffArtworkId` / `customerUploadId`), then catalog design.
 */
export function resolvePrintRequestItemSourceType(
  item: PrintRequestItemSourceFields,
): PrintRequestItemSourceType {
  if (
    item.sourceType === "customer_upload" ||
    item.sourceType === "staff_artwork" ||
    item.sourceType === "catalog_design"
  ) {
    return item.sourceType;
  }
  if (typeof item.staffArtworkId === "string" && item.staffArtworkId.trim()) {
    return "staff_artwork";
  }
  if (typeof item.customerUploadId === "string" && item.customerUploadId.trim()) {
    return "customer_upload";
  }
  return "catalog_design";
}

export function isCatalogDesignPrintRequestItem(
  item: PrintRequestItemSourceFields,
): boolean {
  return resolvePrintRequestItemSourceType(item) === "catalog_design";
}

export function isCustomerUploadPrintRequestItem(
  item: PrintRequestItemSourceFields,
): boolean {
  return resolvePrintRequestItemSourceType(item) === "customer_upload";
}

export function isStaffArtworkPrintRequestItem(
  item: PrintRequestItemSourceFields,
): boolean {
  return resolvePrintRequestItemSourceType(item) === "staff_artwork";
}

/**
 * Whether popularity (`designs.requestCount`) should increment for this item.
 * Customer-upload-only items must not inflate catalog popularity.
 */
export function shouldIncrementDesignRequestCount(
  item: PrintRequestItemSourceFields,
): boolean {
  if (!isCatalogDesignPrintRequestItem(item)) {
    return false;
  }
  return typeof item.designId === "string" && item.designId.trim().length > 0;
}

/** Matches Portal `printRequestItemHasCustomerUpload` for display parity. */
export function isUploadLikePrintRequestItem(
  item: PrintRequestItemSourceFields,
): boolean {
  return item.sourceType === "customer_upload" || Boolean(item.customerUploadId?.trim());
}

export type PrintRequestItemSourcePillVariant = "library" | "uploaded" | "custom";

/** Label + variant for Portal/Studio source pills (Library · Uploaded · Custom). */
export function resolvePrintRequestItemSourcePill(input: {
  item: Pick<PrintRequestItem, "sourceType" | "designId" | "customerUploadId" | "staffArtworkId" | "sourceLabel">;
  fromAssistedCreation?: boolean;
}): { label: string; variant: PrintRequestItemSourcePillVariant } {
  if (input.item.sourceType === "staff_artwork" || input.item.staffArtworkId) {
    return { label: input.item.sourceLabel ?? "Staff-added", variant: "custom" };
  }
  if (!isUploadLikePrintRequestItem(input.item)) {
    return { label: "Library", variant: "library" };
  }
  if (input.fromAssistedCreation) {
    return { label: "Custom", variant: "custom" };
  }
  return { label: "Uploaded", variant: "uploaded" };
}
