import type { Timestamp } from "firebase/firestore";
import type { CatalogTitleSource } from "../design/catalogTitleSource.types";

export type StaffArtworkStatus = "processing" | "ready" | "failed" | "archived";

export type StaffArtworkPromotionStatus = "not_promoted" | "queued" | "promoted" | "failed";

export interface StaffArtworkProcessingMetadata {
  sourceFormat?: string;
  sourceWidthPx?: number;
  sourceHeightPx?: number;
  widthPx?: number;
  heightPx?: number;
  printWidthInches?: number;
  printHeightInches?: number;
  effectiveDpi?: number;
  approvedMaxPrintWidthInches?: number;
  approvedMaxPrintHeightInches?: number;
  sizingPolicyVersion?: string;
  wasTrimmed?: boolean;
  wasUpscaled?: boolean;
  wasNormalizedForDimensions?: boolean;
  upscaleFactor?: number;
  upscalePassCount?: number;
  transparencyPassed?: boolean;
  suggestDarkArtworkBackground?: boolean;
  productionReusedSource?: boolean;
  processingWarning?: string | null;
}

export interface StaffArtwork {
  id: string;
  title: string;
  /** Title authority captured at create/edit time so promotion cannot guess later. */
  catalogTitleSource?: CatalogTitleSource;
  description?: string | null;
  sourceFileName: string;
  contentType: string;
  status: StaffArtworkStatus;

  sourceStoragePath: string;
  productionStoragePath?: string | null;
  interactiveEnhancedProductionStoragePath?: string | null;
  interactiveEnhancedWidthPx?: number;
  interactiveEnhancedHeightPx?: number;
  interactiveEnhanceGeneratedAt?: Timestamp;
  interactiveEnhanceGeneratedBy?: string;
  previewStoragePath?: string | null;
  thumbnailStoragePath?: string | null;

  customerId?: string | null;
  customerDisplayNameSnapshot?: string | null;
  customerUsernameSnapshot?: string | null;

  /**
   * Preview mat hex. Omitted/null = default light grey (`#e5e7eb`).
   * Staff Artwork currently supports grey or dark (`#2c2d2d`) only.
   */
  artworkBackgroundHex?: string | null;
  /**
   * When true at create time, finalize applies dark-mat detection and writes
   * `artworkBackgroundHex`, then clears this flag to false.
   */
  artworkBackgroundAuto?: boolean;

  processing?: StaffArtworkProcessingMetadata;
  processingErrorCode?: string | null;
  processingErrorMessage?: string | null;

  promotedDesignId?: string | null;
  promotionStatus?: StaffArtworkPromotionStatus;
  promotionErrorMessage?: string | null;
  promotionRequestedAt?: Timestamp;
  promotedAt?: Timestamp;

  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
  archivedAt?: Timestamp;
  archivedBy?: string;
}

export interface StaffArtworkSummary {
  id: string;
  title: string;
  description?: string | null;
  customerId?: string | null;
  customerDisplayNameSnapshot?: string | null;
  customerUsernameSnapshot?: string | null;
  artworkBackgroundHex?: string | null;
  status: StaffArtworkStatus;
  previewStoragePath?: string | null;
  thumbnailStoragePath?: string | null;
  widthPx?: number;
  heightPx?: number;
  effectiveDpi?: number;
  processingWarning?: string | null;
}
