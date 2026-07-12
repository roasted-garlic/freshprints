import type { PrintRequestItemSourceType } from "../types/printRequest/printRequest.types";
import {
  assertItemSourceFields,
  allocationSourceTypeFromItem,
} from "./printAssetResolution";
import type { PrintRequestItemSourceFields } from "./printRequestItemSource";

/**
 * Pure allocation field builder — Portal queue callable and Studio allocatePrintRequestItem
 * must produce the same source-aware keys for a given item.
 */
export interface ShowAllocationSourceFieldsInput {
  item: PrintRequestItemSourceFields & {
    titleSnapshot?: string;
    printWidthInches?: number;
    printHeightInches?: number;
    sizeLabel?: string;
    quantity: number;
  };
  /** Required for upload items when titleSnapshot missing on item. */
  uploadOriginalFilename?: string | null;
}

export interface ShowAllocationSourceFields {
  sourceType: PrintRequestItemSourceType;
  designId?: string;
  customerUploadId?: string;
  designTitleSnapshot: string;
}

export function buildShowAllocationSourceFields(
  input: ShowAllocationSourceFieldsInput,
): ShowAllocationSourceFields {
  assertItemSourceFields(input.item);
  const sourceType = allocationSourceTypeFromItem(input.item);

  if (sourceType === "customer_upload") {
    const customerUploadId = input.item.customerUploadId!.trim();
    const designTitleSnapshot =
      input.item.titleSnapshot?.trim() ||
      input.uploadOriginalFilename?.trim() ||
      "Uploaded artwork";

    return {
      sourceType: "customer_upload",
      customerUploadId,
      designTitleSnapshot,
    };
  }

  return {
    sourceType: "catalog_design",
    designId: input.item.designId!.trim(),
    designTitleSnapshot: input.item.titleSnapshot?.trim() || "Design",
  };
}
