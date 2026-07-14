import {
  assessPrintRequestItemSize,
  type PrintRequestItemSizeAssessment,
} from "./printRequestItemSizing";
import {
  isCatalogDesignPrintRequestItem,
  isCustomerUploadPrintRequestItem,
} from "./printRequestItemSource";

export type CurrentRequestAttentionReason =
  | "dpi_below_minimum"
  | "dpi_warning"
  | "upload_processing"
  | "upload_failed"
  | "missing_or_invalid_size";

export interface CurrentRequestAttentionItem {
  itemId: string;
  reasons: CurrentRequestAttentionReason[];
}

export interface CurrentRequestItemLike {
  id: string;
  designId?: string;
  customerUploadId?: string;
  sourceType?: "catalog_design" | "customer_upload";
  quantity: number;
  printWidthInches?: number;
  printHeightInches?: number;
  /** Milliseconds since epoch; used for primary-variant ordering. */
  createdAtMs: number;
  pixelWidth?: number;
  pixelHeight?: number;
  uploadTechnicalStatus?: string | null;
}

export interface CurrentRequestAggregates {
  distinctDesignCount: number;
  totalPrintQuantity: number;
  quantityByDesignId: Record<string, number>;
  /** designId → primary (earliest) catalog-backed item id */
  primaryItemIdByDesignId: Record<string, string>;
  /** designId → quantity on the primary catalog variant only */
  primaryQuantityByDesignId: Record<string, number>;
  attentionItems: CurrentRequestAttentionItem[];
  attentionCount: number;
}

function identityKey(item: CurrentRequestItemLike): string {
  if (isCatalogDesignPrintRequestItem(item) && item.designId?.trim()) {
    return `design:${item.designId.trim()}`;
  }
  if (isCustomerUploadPrintRequestItem(item) && item.customerUploadId?.trim()) {
    return `upload:${item.customerUploadId.trim()}`;
  }
  return `item:${item.id}`;
}

/**
 * Earliest catalog-backed item for a designId (createdAtMs asc, then id asc).
 * Used when re-adding from catalog: increment this variant only.
 */
export function selectPrimaryCatalogVariantItemId(
  items: CurrentRequestItemLike[],
  designId: string,
): string | null {
  const trimmed = designId.trim();
  if (!trimmed) {
    return null;
  }

  const candidates = items.filter(
    (item) =>
      isCatalogDesignPrintRequestItem(item) &&
      typeof item.designId === "string" &&
      item.designId.trim() === trimmed,
  );

  if (candidates.length === 0) {
    return null;
  }

  const sorted = [...candidates].sort((a, b) => {
    if (a.createdAtMs !== b.createdAtMs) {
      return a.createdAtMs - b.createdAtMs;
    }
    return a.id.localeCompare(b.id);
  });

  return sorted[0]?.id ?? null;
}

export function assessCurrentRequestItemAttention(
  item: CurrentRequestItemLike,
): CurrentRequestAttentionReason[] {
  const reasons: CurrentRequestAttentionReason[] = [];

  const width = item.printWidthInches;
  const height = item.printHeightInches;
  const hasValidSize =
    typeof width === "number" &&
    Number.isFinite(width) &&
    width > 0 &&
    typeof height === "number" &&
    Number.isFinite(height) &&
    height > 0;

  if (!hasValidSize) {
    reasons.push("missing_or_invalid_size");
  } else if (
    typeof item.pixelWidth === "number" &&
    typeof item.pixelHeight === "number" &&
    item.pixelWidth > 0 &&
    item.pixelHeight > 0
  ) {
    try {
      const assessment: PrintRequestItemSizeAssessment = assessPrintRequestItemSize({
        pixelWidth: item.pixelWidth,
        pixelHeight: item.pixelHeight,
        printWidthInches: width,
        printHeightInches: height,
      });

      if (!assessment.canSave || assessment.qualityLevel === "below_minimum") {
        reasons.push("dpi_below_minimum");
      } else if (assessment.qualityLevel === "good") {
        // 200–299 effective DPI soft warning
        reasons.push("dpi_warning");
      }
    } catch {
      // Never let attention scoring crash Portal chrome (e.g. degenerate approved-max math).
      reasons.push("missing_or_invalid_size");
    }
  }

  const uploadStatus = item.uploadTechnicalStatus?.trim().toLowerCase() ?? "";
  if (uploadStatus === "failed") {
    reasons.push("upload_failed");
  } else if (
    uploadStatus === "awaiting_upload" ||
    uploadStatus === "uploading" ||
    uploadStatus === "validating" ||
    uploadStatus === "processing"
  ) {
    reasons.push("upload_processing");
  }

  return reasons;
}

export function buildCurrentRequestAggregates(
  items: CurrentRequestItemLike[],
): CurrentRequestAggregates {
  const uniqueKeys = new Set<string>();
  let totalPrintQuantity = 0;
  const quantityByDesignId: Record<string, number> = {};
  const primaryItemIdByDesignId: Record<string, string> = {};
  const primaryQuantityByDesignId: Record<string, number> = {};
  const attentionItems: CurrentRequestAttentionItem[] = [];

  for (const item of items) {
    uniqueKeys.add(identityKey(item));
    const qty = Number.isFinite(item.quantity) ? item.quantity : 0;
    totalPrintQuantity += qty;

    if (isCatalogDesignPrintRequestItem(item) && item.designId?.trim()) {
      const designId = item.designId.trim();
      quantityByDesignId[designId] = (quantityByDesignId[designId] ?? 0) + qty;
    }
  }

  for (const designId of Object.keys(quantityByDesignId)) {
    const primaryId = selectPrimaryCatalogVariantItemId(items, designId);
    if (primaryId) {
      primaryItemIdByDesignId[designId] = primaryId;
      const primary = items.find((item) => item.id === primaryId);
      primaryQuantityByDesignId[designId] = primary
        ? Number.isFinite(primary.quantity)
          ? primary.quantity
          : 0
        : 0;
    }
  }

  for (const item of items) {
    const reasons = assessCurrentRequestItemAttention(item);
    if (reasons.length > 0) {
      attentionItems.push({ itemId: item.id, reasons });
    }
  }

  return {
    distinctDesignCount: uniqueKeys.size,
    totalPrintQuantity,
    quantityByDesignId,
    primaryItemIdByDesignId,
    primaryQuantityByDesignId,
    attentionItems,
    attentionCount: attentionItems.length,
  };
}

/**
 * Pure helper: given existing items and a design to add, return whether to
 * increment the primary variant or create a new line.
 */
export function resolveCatalogAddAction(
  items: CurrentRequestItemLike[],
  designId: string,
): { kind: "increment"; itemId: string; nextQuantity: number } | { kind: "create" } {
  const primaryId = selectPrimaryCatalogVariantItemId(items, designId);
  if (!primaryId) {
    return { kind: "create" };
  }

  const primary = items.find((item) => item.id === primaryId);
  if (!primary) {
    return { kind: "create" };
  }

  return {
    kind: "increment",
    itemId: primaryId,
    nextQuantity: (Number.isFinite(primary.quantity) ? primary.quantity : 0) + 1,
  };
}
