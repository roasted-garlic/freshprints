import { resolveActiveArtworkPixelDimensions } from "./interactiveArtworkEnhance";
import {
  resolvePrintAssetPaths,
  type CatalogDesignAssetInput,
  type CustomerUploadAssetInput,
} from "./printAssetResolution";
import {
  isCustomerUploadPrintRequestItem,
  type PrintRequestItemSourceFields,
} from "./printRequestItemSource";

export interface ShowExportPrintRequestItemFields extends PrintRequestItemSourceFields {
  titleSnapshot?: string;
  artworkEnhanceMode?: "baseline" | "enhanced";
}

export interface ResolvedShowExportProductionAsset {
  productionStoragePath: string;
  sourceWidthPx: number;
  sourceHeightPx: number;
  titleSnapshot?: string;
}

/**
 * Resolve the production storage path and source pixel dimensions for show export / gang sheet
 * compositing. Uses persisted `artworkEnhanceMode` on the print request item as the selector.
 */
export function resolveShowExportProductionAsset(input: {
  item: ShowExportPrintRequestItemFields;
  catalogDesign?: CatalogDesignAssetInput | null;
  customerUpload?: CustomerUploadAssetInput | null;
}): ResolvedShowExportProductionAsset {
  const resolved = resolvePrintAssetPaths({
    item: input.item,
    catalogDesign: input.catalogDesign,
    customerUpload: input.customerUpload,
  });

  const isUpload = isCustomerUploadPrintRequestItem(input.item);
  const catalogDesign = input.catalogDesign;
  const customerUpload = input.customerUpload;

  const baselineWidthPx = isUpload
    ? (customerUpload?.widthPx ?? 0)
    : (catalogDesign?.widthPx ?? 0);
  const baselineHeightPx = isUpload
    ? (customerUpload?.heightPx ?? 0)
    : (catalogDesign?.heightPx ?? 0);
  const enhancedWidthPx = isUpload
    ? customerUpload?.interactiveEnhancedWidthPx
    : catalogDesign?.interactiveEnhancedWidthPx;
  const enhancedHeightPx = isUpload
    ? customerUpload?.interactiveEnhancedHeightPx
    : catalogDesign?.interactiveEnhancedHeightPx;

  const { widthPx, heightPx } = resolveActiveArtworkPixelDimensions({
    artworkEnhanceMode: input.item.artworkEnhanceMode,
    baselineWidthPx,
    baselineHeightPx,
    enhancedWidthPx,
    enhancedHeightPx,
  });

  if (widthPx <= 0 || heightPx <= 0) {
    throw new Error(
      isUpload
        ? "Customer upload artwork pixel dimensions are missing or invalid."
        : "Catalog design artwork pixel dimensions are missing or invalid.",
    );
  }

  return {
    productionStoragePath: resolved.productionStoragePath,
    sourceWidthPx: widthPx,
    sourceHeightPx: heightPx,
    titleSnapshot: resolved.titleSnapshot,
  };
}

export function toCatalogDesignAssetInput(design: {
  id: string;
  originalPath: string;
  interactiveEnhancedOriginalPath?: string;
  interactiveEnhancedWidthPx?: number;
  interactiveEnhancedHeightPx?: number;
  width?: number;
  height?: number;
  previewPath?: string;
  thumbnailPath?: string;
  title?: string;
}): CatalogDesignAssetInput {
  return {
    designId: design.id,
    originalPath: design.originalPath,
    interactiveEnhancedOriginalPath: design.interactiveEnhancedOriginalPath,
    interactiveEnhancedWidthPx: design.interactiveEnhancedWidthPx,
    interactiveEnhancedHeightPx: design.interactiveEnhancedHeightPx,
    widthPx: design.width,
    heightPx: design.height,
    previewPath: design.previewPath,
    thumbnailPath: design.thumbnailPath,
    title: design.title,
  };
}

export function toCustomerUploadAssetInput(upload: {
  id: string;
  productionStoragePath: string | null;
  interactiveEnhancedProductionStoragePath?: string | null;
  interactiveEnhancedWidthPx?: number | null;
  interactiveEnhancedHeightPx?: number | null;
  widthPx?: number | null;
  heightPx?: number | null;
  previewStoragePath?: string | null;
  thumbnailStoragePath?: string | null;
  originalFilename?: string;
  titleSnapshot?: string | null;
}): CustomerUploadAssetInput {
  return {
    customerUploadId: upload.id,
    productionStoragePath: upload.productionStoragePath?.trim() ?? "",
    interactiveEnhancedProductionStoragePath: upload.interactiveEnhancedProductionStoragePath,
    interactiveEnhancedWidthPx: upload.interactiveEnhancedWidthPx ?? undefined,
    interactiveEnhancedHeightPx: upload.interactiveEnhancedHeightPx ?? undefined,
    widthPx: upload.widthPx,
    heightPx: upload.heightPx,
    previewStoragePath: upload.previewStoragePath,
    thumbnailStoragePath: upload.thumbnailStoragePath,
    originalFilename: upload.originalFilename,
    titleSnapshot: upload.titleSnapshot,
  };
}

export function toShowExportPrintRequestItemFields(item: {
  sourceType?: "catalog_design" | "customer_upload";
  designId?: string;
  customerUploadId?: string;
  titleSnapshot?: string;
  artworkEnhanceMode?: "baseline" | "enhanced";
}): ShowExportPrintRequestItemFields {
  return {
    sourceType: item.sourceType,
    designId: item.designId,
    customerUploadId: item.customerUploadId,
    titleSnapshot: item.titleSnapshot,
    artworkEnhanceMode: item.artworkEnhanceMode,
  };
}
