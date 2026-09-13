import type { Timestamp } from "firebase/firestore";

import type { PortalPrintRequestItem } from "../types/portal/portalPrintRequestItem.types";

type CanonicalPrintRequestItemData = Record<string, unknown>;

/** Admin-only enrichment copied from staffArtworks into the customer projection allowlist. */
export type StaffArtworkProjectionEnrichment = {
  title?: string;
  previewStoragePath?: string;
  thumbnailStoragePath?: string;
  widthPx?: number;
  heightPx?: number;
  artworkBackgroundHex?: string;
};

function timestampOrNull(value: unknown): Timestamp | null {
  return value && typeof (value as { toMillis?: unknown }).toMillis === "function"
    ? (value as Timestamp)
    : null;
}

function trimString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function positiveInt(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : undefined;
}

/**
 * Build customer-safe Staff Artwork enrichment from an Admin-read staffArtworks document.
 * Deliberately copies only allowlisted fields — never notes, production paths, or processing blobs.
 */
export function buildStaffArtworkProjectionEnrichment(
  artwork: Record<string, unknown> | null | undefined,
): StaffArtworkProjectionEnrichment | null {
  if (!artwork) return null;
  const processing =
    artwork.processing && typeof artwork.processing === "object"
      ? (artwork.processing as Record<string, unknown>)
      : {};
  const enrichment: StaffArtworkProjectionEnrichment = {};
  const title = trimString(artwork.title);
  const previewStoragePath = trimString(artwork.previewStoragePath);
  const thumbnailStoragePath = trimString(artwork.thumbnailStoragePath);
  const widthPx = positiveInt(processing.widthPx);
  const heightPx = positiveInt(processing.heightPx);
  const artworkBackgroundHex = trimString(artwork.artworkBackgroundHex);
  if (title) enrichment.title = title;
  if (previewStoragePath) enrichment.previewStoragePath = previewStoragePath;
  if (thumbnailStoragePath) enrichment.thumbnailStoragePath = thumbnailStoragePath;
  if (widthPx !== undefined) enrichment.widthPx = widthPx;
  if (heightPx !== undefined) enrichment.heightPx = heightPx;
  if (artworkBackgroundHex) enrichment.artworkBackgroundHex = artworkBackgroundHex;
  return Object.keys(enrichment).length > 0 ? enrichment : null;
}

/**
 * Strict allowlist for the customer-readable request-item boundary.
 * Staff Artwork private management fields are never copied unless allowlisted above.
 */
export function projectPortalPrintRequestItem(
  itemId: string,
  data: CanonicalPrintRequestItemData,
  enrichment: StaffArtworkProjectionEnrichment | null = null,
): PortalPrintRequestItem | null {
  const printRequestId = typeof data.printRequestId === "string" ? data.printRequestId.trim() : "";
  const addedBy = typeof data.addedBy === "string" ? data.addedBy.trim() : "";
  const quantity = typeof data.quantity === "number" ? Math.floor(data.quantity) : NaN;
  const status = typeof data.status === "string" ? data.status : "";
  const createdAt = timestampOrNull(data.createdAt);
  const updatedAt = timestampOrNull(data.updatedAt);
  if (!itemId.trim() || !printRequestId || !addedBy || !Number.isFinite(quantity) || quantity < 1 || !status || !createdAt || !updatedAt) {
    return null;
  }

  const sourceType =
    data.sourceType === "customer_upload" || data.sourceType === "staff_artwork" || data.sourceType === "catalog_design"
      ? data.sourceType
      : undefined;
  const customerUploadId = typeof data.customerUploadId === "string" && data.customerUploadId.trim()
    ? data.customerUploadId.trim()
    : undefined;
  const designId = typeof data.designId === "string" && data.designId.trim() ? data.designId.trim() : undefined;
  const staffArtworkId = trimString(data.staffArtworkId);
  const isStaffArtwork = sourceType === "staff_artwork" || Boolean(staffArtworkId);

  const result: PortalPrintRequestItem = {
    id: itemId.trim(),
    printRequestId,
    sourceType: isStaffArtwork ? "staff_artwork" : sourceType ?? (customerUploadId ? "customer_upload" : "catalog_design"),
    quantity,
    status: status as PortalPrintRequestItem["status"],
    addedBy,
    createdAt: createdAt as PortalPrintRequestItem["createdAt"],
    updatedAt: updatedAt as PortalPrintRequestItem["updatedAt"],
  };

  if (isStaffArtwork) {
    result.sourceLabel = "Staff-added";
    if (staffArtworkId) result.staffArtworkId = staffArtworkId;
    const title = enrichment?.title ?? trimString(data.titleSnapshot);
    if (title) result.titleSnapshot = title;
    if (enrichment?.previewStoragePath) result.previewStoragePath = enrichment.previewStoragePath;
    if (enrichment?.thumbnailStoragePath) result.thumbnailStoragePath = enrichment.thumbnailStoragePath;
    if (enrichment?.widthPx !== undefined) result.widthPx = enrichment.widthPx;
    if (enrichment?.heightPx !== undefined) result.heightPx = enrichment.heightPx;
    if (enrichment?.artworkBackgroundHex) result.artworkBackgroundHex = enrichment.artworkBackgroundHex;
  } else {
    if (designId) result.designId = designId;
    if (customerUploadId) result.customerUploadId = customerUploadId;
    if (typeof data.titleSnapshot === "string" && data.titleSnapshot.trim()) result.titleSnapshot = data.titleSnapshot.trim();
  }

  if (typeof data.printWidthInches === "number" && Number.isFinite(data.printWidthInches)) result.printWidthInches = data.printWidthInches;
  if (typeof data.printHeightInches === "number" && Number.isFinite(data.printHeightInches)) result.printHeightInches = data.printHeightInches;
  if (typeof data.sizeLabel === "string") result.sizeLabel = data.sizeLabel;
  if (typeof data.standardSizePresetKey === "string" && data.standardSizePresetKey.trim()) result.standardSizePresetKey = data.standardSizePresetKey.trim();
  if (typeof data.sortOrder === "number" && Number.isFinite(data.sortOrder)) result.sortOrder = data.sortOrder;
  if (!isStaffArtwork && typeof data.notes === "string") result.notes = data.notes;
  if (!isStaffArtwork && (data.artworkEnhanceMode === "baseline" || data.artworkEnhanceMode === "enhanced")) {
    result.artworkEnhanceMode = data.artworkEnhanceMode;
  }
  if (!isStaffArtwork) {
    if (typeof data.preEnhancePrintWidthInches === "number") result.preEnhancePrintWidthInches = data.preEnhancePrintWidthInches;
    if (typeof data.preEnhancePrintHeightInches === "number") result.preEnhancePrintHeightInches = data.preEnhancePrintHeightInches;
  }
  return result;
}
