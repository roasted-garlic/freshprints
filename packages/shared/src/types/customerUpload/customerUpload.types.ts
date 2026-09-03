import type { Timestamp } from "firebase/firestore";

import type {
  CustomerUploadBatchStatus,
  CustomerUploadCatalogReviewStatus,
  CustomerUploadPurpose,
  CustomerUploadSourceFormat,
  CustomerUploadTechnicalFailureCode,
  CustomerUploadTechnicalProgressStage,
  CustomerUploadTechnicalStatus,
} from "./customerUpload.enums";

export interface CustomerUploadBatch {
  id: string;
  customerUid: string;
  customerId: string;
  /** `guest` for anonymous Portal donations (#13 Addendum A); omit/customer for registered. */
  uploaderType?: import("../../constants/customerUpload/customerUploadGuest.constants").CustomerUploadUploaderType;
  /** Missing on legacy docs — treat as print_request. */
  purpose?: CustomerUploadPurpose;
  printRequestId: string | null;
  status: CustomerUploadBatchStatus;
  fileCount: number;
  readyCount: number;
  failedCount: number;
  ownershipConfirmed: boolean;
  catalogUseAcknowledged: boolean;
  termsVersion: string | null;
  confirmedAt: Timestamp | null;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CustomerUpload {
  id: string;
  batchId: string;
  customerUid: string;
  customerId: string;
  /** `guest` for anonymous Portal donations (#13 Addendum A); omit/customer for registered. */
  uploaderType?: import("../../constants/customerUpload/customerUploadGuest.constants").CustomerUploadUploaderType;
  /** Missing on legacy docs — treat as print_request. */
  purpose?: CustomerUploadPurpose;
  printRequestId: string | null;
  originalFilename: string;
  sourceFormat: CustomerUploadSourceFormat | null;
  sourceStoragePath: string | null;
  productionStoragePath: string | null;
  previewStoragePath: string | null;
  thumbnailStoragePath: string | null;
  widthPx: number | null;
  heightPx: number | null;
  sourceWidthPx?: number | null;
  sourceHeightPx?: number | null;
  printWidthInches: number | null;
  printHeightInches: number | null;
  effectiveDpi: number | null;
  wasUpscaled?: boolean;
  wasTrimmed?: boolean;
  /**
   * True only when the downscale-only dimension-ceiling normalization pass ran (ADR-FP-125).
   * Independent of `wasUpscaled` — the two are separate, opposite-direction operations and are
   * not mutually exclusive by type; do not assume only one can ever be true.
   */
  wasNormalizedForDimensions?: boolean;
  /** Source pixel dimensions before normalization; present only when wasNormalizedForDimensions is true. */
  preNormalizationWidthPx?: number | null;
  preNormalizationHeightPx?: number | null;
  upscaleFactor?: number | null;
  upscalePassCount?: 0 | 1 | null;
  approvedMaxPrintWidthInches?: number | null;
  approvedMaxPrintHeightInches?: number | null;
  sizingPolicyVersion?: string | null;
  sizingWarningCode?: string | null;
  transparencyPassed: boolean | null;
  transparentPixelRatio?: number | null;
  /** Automatic halftone scan (server-authored). */
  halftoneDetection?: import("../halftone/halftone.types").HalftoneDetectionPersisted | null;
  /** Customer/staff uploader confirmation (user input). */
  halftoneSubmitterResponse?: import("../halftone/halftone.types").HalftoneSubmitterResponsePersisted | null;
  /** Staff decision (authoritative for catalog). */
  halftoneStaffDecision?: import("../halftone/halftone.types").HalftoneStaffDecisionPersisted | null;
  /** Artwork background hex for intake/review display mat (staff override). */
  artworkBackgroundHex?: string | null;
  /** Source of artwork background decision. */
  artworkBackgroundSource?: import("../design/artworkBackgroundSource.types").ArtworkBackgroundSource | null;
  technicalStatus: CustomerUploadTechnicalStatus;
  /** Live finalize progress; null when idle, ready, or failed. */
  technicalProgressStage?: CustomerUploadTechnicalProgressStage | null;
  technicalFailureCode: CustomerUploadTechnicalFailureCode | null;
  technicalFailureMessage: string | null;
  catalogReviewStatus: CustomerUploadCatalogReviewStatus;
  promotedDesignId: string | null;
  ownershipConfirmed: boolean;
  catalogUseAcknowledged: boolean;
  termsVersion: string | null;
  confirmedAt: Timestamp | null;
  /** Set when source + production Storage objects were purged (thumbnail/preview kept). */
  fullSizePurgedAt?: Timestamp | null;
  fullSizePurgedBy?: string | null;
  /** Set when staff promote a donation/upload to AI Review (cool-off clock). */
  promotedAt?: Timestamp | null;
  /**
   * When set, this upload was server-copied from an Assisted Creation approved proof
   * (private print-only; not a customer self-upload).
   */
  assistedCreationRequestId?: string | null;
  assistedProofId?: string | null;
  assistedFinalSourceId?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Current customer-facing confirmation copy version (print-request attach). */
export const CUSTOMER_UPLOAD_TERMS_VERSION = "customer-upload-terms-v2" as const;

/** Catalog donation confirmation copy version (donate confirm; listing consent required). */
export const CUSTOMER_UPLOAD_DONATE_TERMS_VERSION = "customer-upload-donate-terms-v1" as const;
