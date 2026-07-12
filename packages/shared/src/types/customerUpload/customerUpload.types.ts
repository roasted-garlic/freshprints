import type { Timestamp } from "firebase/firestore";

import type {
  CustomerUploadBatchStatus,
  CustomerUploadCatalogReviewStatus,
  CustomerUploadSourceFormat,
  CustomerUploadTechnicalFailureCode,
  CustomerUploadTechnicalProgressStage,
  CustomerUploadTechnicalStatus,
} from "./customerUpload.enums";

export interface CustomerUploadBatch {
  id: string;
  customerUid: string;
  customerId: string;
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
  transparencyPassed: boolean | null;
  transparentPixelRatio?: number | null;
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
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Current customer-facing confirmation copy version. */
export const CUSTOMER_UPLOAD_TERMS_VERSION = "customer-upload-terms-v2" as const;
