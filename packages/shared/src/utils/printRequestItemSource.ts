import type {
  PrintRequestItem,
  PrintRequestItemSourceType,
} from "../types/printRequest/printRequest.types";

export type PrintRequestItemSourceFields = Pick<
  PrintRequestItem,
  "sourceType" | "designId" | "customerUploadId"
>;

/**
 * Resolves item provenance. Legacy docs without `sourceType` are catalog designs.
 */
export function resolvePrintRequestItemSourceType(
  item: PrintRequestItemSourceFields,
): PrintRequestItemSourceType {
  if (item.sourceType === "customer_upload") {
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
  item: Pick<PrintRequestItem, "sourceType" | "customerUploadId">,
): boolean {
  return item.sourceType === "customer_upload" || Boolean(item.customerUploadId?.trim());
}

export type PrintRequestItemSourcePillVariant = "library" | "uploaded" | "custom";

/** Label + variant for Portal/Studio source pills (Library · Uploaded · Custom). */
export function resolvePrintRequestItemSourcePill(input: {
  item: Pick<PrintRequestItem, "sourceType" | "customerUploadId">;
  fromAssistedCreation?: boolean;
}): { label: string; variant: PrintRequestItemSourcePillVariant } {
  if (!isUploadLikePrintRequestItem(input.item)) {
    return { label: "Library", variant: "library" };
  }
  if (input.fromAssistedCreation) {
    return { label: "Custom", variant: "custom" };
  }
  return { label: "Uploaded", variant: "uploaded" };
}
