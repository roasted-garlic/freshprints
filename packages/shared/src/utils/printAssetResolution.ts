import {
  isCustomerUploadPrintRequestItem,
  resolvePrintRequestItemSourceType,
  type PrintRequestItemSourceFields,
} from "./printRequestItemSource";
import { resolveArtworkEnhanceMode } from "./interactiveArtworkEnhance";

export type PrintAssetSourceType = "catalog_design" | "customer_upload";

export interface ResolvedPrintAssetPaths {
  sourceType: PrintAssetSourceType;
  designId?: string;
  customerUploadId?: string;
  /** Production PNG path used for print/export. */
  productionStoragePath: string;
  previewStoragePath?: string;
  thumbnailStoragePath?: string;
  titleSnapshot?: string;
}

export interface CatalogDesignAssetInput {
  designId: string;
  originalPath: string;
  interactiveEnhancedOriginalPath?: string;
  interactiveEnhancedWidthPx?: number;
  interactiveEnhancedHeightPx?: number;
  widthPx?: number;
  heightPx?: number;
  previewPath?: string;
  thumbnailPath?: string;
  title?: string;
}

export interface CustomerUploadAssetInput {
  customerUploadId: string;
  productionStoragePath: string;
  interactiveEnhancedProductionStoragePath?: string | null;
  interactiveEnhancedWidthPx?: number;
  interactiveEnhancedHeightPx?: number;
  widthPx?: number | null;
  heightPx?: number | null;
  previewStoragePath?: string | null;
  thumbnailStoragePath?: string | null;
  originalFilename?: string | null;
  titleSnapshot?: string | null;
  /** Ignored for production resolution — catalog exclusion must not block print. */
  catalogReviewStatus?: string | null;
}

/**
 * Resolve production asset paths for a print-request / allocation line.
 * Catalog exclusion / AI review status must not affect production path selection.
 */
export function resolvePrintAssetPaths(input: {
  item: PrintRequestItemSourceFields & {
    titleSnapshot?: string;
    artworkEnhanceMode?: "baseline" | "enhanced";
  };
  catalogDesign?: CatalogDesignAssetInput | null;
  customerUpload?: CustomerUploadAssetInput | null;
}): ResolvedPrintAssetPaths {
  const sourceType = resolvePrintRequestItemSourceType(input.item);
  const artworkEnhanceMode = resolveArtworkEnhanceMode(input.item.artworkEnhanceMode);

  if (sourceType === "customer_upload") {
    const upload = input.customerUpload;
    const customerUploadId =
      (typeof input.item.customerUploadId === "string" && input.item.customerUploadId.trim()) ||
      upload?.customerUploadId?.trim() ||
      "";
    const enhancedProductionPath = upload?.interactiveEnhancedProductionStoragePath?.trim() ?? "";
    const baselineProductionPath = upload?.productionStoragePath?.trim() ?? "";
    let productionStoragePath = baselineProductionPath;
    if (artworkEnhanceMode === "enhanced") {
      if (!enhancedProductionPath) {
        throw new Error(
          "Interactive enhanced artwork is unavailable for this customer upload. Turn Upscale off or re-run enhance.",
        );
      }
      productionStoragePath = enhancedProductionPath;
    }
    if (!upload || !customerUploadId || !productionStoragePath) {
      throw new Error("Customer upload production asset is missing.");
    }

    return {
      sourceType: "customer_upload",
      customerUploadId,
      productionStoragePath,
      previewStoragePath: upload.previewStoragePath?.trim() || undefined,
      thumbnailStoragePath: upload.thumbnailStoragePath?.trim() || undefined,
      titleSnapshot:
        upload.titleSnapshot?.trim() ||
        upload.originalFilename?.trim() ||
        input.item.titleSnapshot?.trim() ||
        "Uploaded artwork",
    };
  }

  const design = input.catalogDesign;
  const designId =
    (typeof input.item.designId === "string" && input.item.designId.trim()) ||
    design?.designId?.trim() ||
    "";
  const enhancedOriginalPath = design?.interactiveEnhancedOriginalPath?.trim() ?? "";
  const baselineOriginalPath = design?.originalPath?.trim() ?? "";
  let productionStoragePath = baselineOriginalPath;
  if (artworkEnhanceMode === "enhanced") {
    if (!enhancedOriginalPath) {
      throw new Error(
        "Interactive enhanced artwork is unavailable for this catalog design. Turn Upscale off or re-run enhance.",
      );
    }
    productionStoragePath = enhancedOriginalPath;
  }
  if (!design || !designId || !productionStoragePath) {
    throw new Error("Catalog design production asset is missing.");
  }

  return {
    sourceType: "catalog_design",
    designId,
    productionStoragePath,
    previewStoragePath: design.previewPath?.trim() || undefined,
    thumbnailStoragePath: design.thumbnailPath?.trim() || undefined,
    titleSnapshot: design.title?.trim() || input.item.titleSnapshot?.trim(),
  };
}

export function isCustomerUploadProductionStoragePath(path: string): boolean {
  return /^\/customer-uploads\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/production\.png$/.test(path.trim());
}

export function isCatalogOriginalStoragePath(path: string): boolean {
  return /^\/originals\/[A-Za-z0-9_-]+\.png$/.test(path.trim());
}

export function isCatalogInteractiveOriginalStoragePath(path: string): boolean {
  return /^\/originals\/[A-Za-z0-9_-]+\.interactive\.png$/.test(path.trim());
}

export function isCustomerUploadInteractiveProductionStoragePath(path: string): boolean {
  return /^\/customer-uploads\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/production\.interactive\.png$/.test(
    path.trim(),
  );
}

export function isAllowedGangSheetOriginalPathSnapshot(path: string): boolean {
  const trimmed = path.trim();
  return (
    isCatalogOriginalStoragePath(trimmed) ||
    isCatalogInteractiveOriginalStoragePath(trimmed) ||
    isCustomerUploadProductionStoragePath(trimmed) ||
    isCustomerUploadInteractiveProductionStoragePath(trimmed)
  );
}

export function allocationSourceTypeFromItem(
  item: PrintRequestItemSourceFields,
): PrintAssetSourceType {
  return resolvePrintRequestItemSourceType(item);
}

export function assertItemSourceFields(item: PrintRequestItemSourceFields): void {
  if (isCustomerUploadPrintRequestItem(item)) {
    if (typeof item.designId === "string" && item.designId.length > 0) {
      throw new Error("Upload-backed items must omit designId.");
    }
    if (typeof item.customerUploadId !== "string" || !item.customerUploadId.trim()) {
      throw new Error("Upload-backed items require customerUploadId.");
    }
    return;
  }

  if (typeof item.designId !== "string" || !item.designId.trim()) {
    throw new Error("Catalog items require designId.");
  }
}
