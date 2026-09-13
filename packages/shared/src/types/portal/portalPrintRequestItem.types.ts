import type { Timestamp } from "firebase/firestore";

import type {
  PrintRequestItemSourceType,
} from "../printRequest/printRequest.types";
import type { PrintRequestItemStatus } from "../printRequest/printRequest.enums";

/** Customer-readable, server-authored request-item projection. */
export interface PortalPrintRequestItem {
  id: string;
  printRequestId: string;
  sourceType?: PrintRequestItemSourceType;
  /** Catalog identity is safe because it is already customer-readable. */
  designId?: string;
  /** Customer-upload identity is safe for the existing upload workflow. */
  customerUploadId?: string;
  /** Staff Artwork identity — owner-approved on the projection; do not display as title. */
  staffArtworkId?: string;
  /** Source pill / badge for Staff Artwork rows. */
  sourceLabel?: "Staff-added";
  /**
   * Display title. For Staff Artwork this is the artwork title (enriched).
   * For catalog/upload this remains the existing customer-safe snapshot.
   */
  titleSnapshot?: string;
  /** Staff Artwork customer-safe preview path (preview.webp). */
  previewStoragePath?: string;
  /** Staff Artwork customer-safe thumbnail path (thumbnail.webp). */
  thumbnailStoragePath?: string;
  /** Baseline pixel width for live DPI assessment. */
  widthPx?: number;
  /** Baseline pixel height for live DPI assessment. */
  heightPx?: number;
  /** Optional mat background for preview rendering. */
  artworkBackgroundHex?: string;
  quantity: number;
  printWidthInches?: number;
  printHeightInches?: number;
  sizeLabel?: string;
  standardSizePresetKey?: string;
  sortOrder?: number;
  notes?: string;
  artworkEnhanceMode?: "baseline" | "enhanced";
  preEnhancePrintWidthInches?: number;
  preEnhancePrintHeightInches?: number;
  status: PrintRequestItemStatus;
  addedBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
