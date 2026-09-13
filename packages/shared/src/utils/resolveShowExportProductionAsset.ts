import { resolveActiveArtworkPixelDimensions } from "./interactiveArtworkEnhance";
import {
  resolvePrintAssetPaths,
  type CatalogDesignAssetInput,
  type CustomerUploadAssetInput,
  type StaffArtworkAssetInput,
} from "./printAssetResolution";
import {
  isCustomerUploadPrintRequestItem,
  isStaffArtworkPrintRequestItem,
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
  staffArtwork?: StaffArtworkAssetInput | null;
}): ResolvedShowExportProductionAsset {
  const resolved = resolvePrintAssetPaths({
    item: input.item,
    catalogDesign: input.catalogDesign,
    customerUpload: input.customerUpload,
    staffArtwork: input.staffArtwork,
  });

  const isUpload = isCustomerUploadPrintRequestItem(input.item);
  const catalogDesign = input.catalogDesign;
  const customerUpload = input.customerUpload;
  const staffArtwork = input.staffArtwork;

  const isStaffArtwork = isStaffArtworkPrintRequestItem(input.item);
  const baselineWidthPx = isUpload
    ? (customerUpload?.widthPx ?? 0)
    : isStaffArtwork
      ? (staffArtwork?.widthPx ?? 0)
      : (catalogDesign?.widthPx ?? 0);
  const baselineHeightPx = isUpload
    ? (customerUpload?.heightPx ?? 0)
    : isStaffArtwork
      ? (staffArtwork?.heightPx ?? 0)
      : (catalogDesign?.heightPx ?? 0);
  const enhancedWidthPx = isUpload
    ? customerUpload?.interactiveEnhancedWidthPx
    : isStaffArtwork
      ? staffArtwork?.interactiveEnhancedWidthPx ?? undefined
      : catalogDesign?.interactiveEnhancedWidthPx;
  const enhancedHeightPx = isUpload
    ? customerUpload?.interactiveEnhancedHeightPx
    : isStaffArtwork
      ? staffArtwork?.interactiveEnhancedHeightPx ?? undefined
      : catalogDesign?.interactiveEnhancedHeightPx;

  const active = resolveActiveArtworkPixelDimensions({
    artworkEnhanceMode: input.item.artworkEnhanceMode,
    baselineWidthPx,
    baselineHeightPx,
    enhancedWidthPx,
    enhancedHeightPx,
  });

  if (!active || active.widthPx <= 0 || active.heightPx <= 0) {
    throw new Error(
      isUpload
        ? input.item.artworkEnhanceMode === "enhanced"
          ? "Enhanced customer upload pixel dimensions are missing or invalid."
          : "Customer upload artwork pixel dimensions are missing or invalid."
        : isStaffArtwork
          ? input.item.artworkEnhanceMode === "enhanced"
            ? "Enhanced Staff Artwork pixel dimensions are missing or invalid."
            : "Staff Artwork pixel dimensions are missing or invalid."
          : input.item.artworkEnhanceMode === "enhanced"
          ? "Enhanced catalog design pixel dimensions are missing or invalid."
          : "Catalog design artwork pixel dimensions are missing or invalid.",
    );
  }

  return {
    productionStoragePath: resolved.productionStoragePath,
    sourceWidthPx: active.widthPx,
    sourceHeightPx: active.heightPx,
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

export function toStaffArtworkAssetInput(artwork: {
  id: string;
  productionStoragePath?: string | null;
  interactiveEnhancedProductionStoragePath?: string | null;
  interactiveEnhancedWidthPx?: number | null;
  interactiveEnhancedHeightPx?: number | null;
  widthPx?: number | null;
  heightPx?: number | null;
  previewStoragePath?: string | null;
  thumbnailStoragePath?: string | null;
  title?: string | null;
}): StaffArtworkAssetInput {
  return {
    staffArtworkId: artwork.id,
    productionStoragePath: artwork.productionStoragePath?.trim() ?? "",
    interactiveEnhancedProductionStoragePath: artwork.interactiveEnhancedProductionStoragePath,
    interactiveEnhancedWidthPx: artwork.interactiveEnhancedWidthPx ?? undefined,
    interactiveEnhancedHeightPx: artwork.interactiveEnhancedHeightPx ?? undefined,
    widthPx: artwork.widthPx,
    heightPx: artwork.heightPx,
    previewStoragePath: artwork.previewStoragePath,
    thumbnailStoragePath: artwork.thumbnailStoragePath,
    title: artwork.title,
  };
}

export function toShowExportPrintRequestItemFields(item: {
  sourceType?: "catalog_design" | "customer_upload" | "staff_artwork";
  designId?: string;
  customerUploadId?: string;
  staffArtworkId?: string;
  titleSnapshot?: string;
  artworkEnhanceMode?: "baseline" | "enhanced";
}): ShowExportPrintRequestItemFields {
  return {
    sourceType: item.sourceType,
    designId: item.designId,
    customerUploadId: item.customerUploadId,
    staffArtworkId: item.staffArtworkId,
    titleSnapshot: item.titleSnapshot,
    artworkEnhanceMode: item.artworkEnhanceMode,
  };
}
