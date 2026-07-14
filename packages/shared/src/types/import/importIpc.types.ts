import type { FreshPrintsAppApi } from "../app/appIpc.types";
import type { FreshPrintsInboxAlertApi } from "../inboxAlert/inboxAlertIpc.types";
import type { FreshPrintsExportApi } from "../export/showExportIpc.types";
import type { FreshPrintsWhatnotImportApi } from "../whatnotImport/whatnotImport.types";
import type { PrintSizeAssessment } from "../printSize/printSize.types";
import type {
  BatchDiscoveryCompleteEvent,
  BatchImportJobId,
  BatchImportSourceType,
  BatchJobErrorEvent,
  BatchImportProgressEvent,
} from "./batchImport.types";
import type {
  DerivativeGenerationFailure,
  DerivativeGenerationVerificationResult,
  PreviewDerivativeMetadata,
  ThumbnailDerivativeMetadata,
} from "./derivativeGeneration.types";
import type {
  ImportDerivativeStatus,
  ImportFinalDesignStatus,
} from "./importOrchestration.types";

export type {
  ImportDerivativePipelineFailure,
  ImportDerivativePipelineResult,
  ImportDerivativePipelineSuccess,
  ImportDerivativeStatus,
  ImportFinalDesignStatus,
  ImportPipelineOutcomeFields,
} from "./importOrchestration.types";
export { formatDerivativeGenerationError } from "./importOrchestration.types";
import type {
  ReadBatchValidatedPngFileBytesRequest,
  ReadSelectedPngFileBytesRequest,
} from "./readPngFileBytes.types";

export type { BatchImportSourceType } from "./batchImport.types";
export type {
  BatchDiscoveryCompleteEvent,
  BatchDiscoverySummary,
  BatchImportFileManifestEntry,
  BatchImportFileOutcome,
  BatchImportFileResult,
  BatchImportFileResultOutcome,
  BatchImportFileStatus,
  BatchImportFinalReport,
  BatchImportJobId,
  BatchImportJobState,
  BatchImportJobStatus,
  BatchImportPhase,
  BatchImportProgressEvent,
  BatchJobErrorEvent,
  ImportFileRejection,
  ImportFileRejectionReasonCode,
  BatchImportSessionRecord,
  BatchImportSessionStatus,
} from "./batchImport.types";
export { createInitialBatchImportJobState } from "./batchImport.types";

export type ImportIpcErrorCode =
  | "NOT_IMPLEMENTED"
  | "INVALID_INPUT"
  | "SESSION_CONFLICT"
  | "CANCELED"
  | "VALIDATION_FAILED"
  | "FILE_NOT_FOUND"
  | "FILE_TOO_LARGE"
  | "INTERNAL_ERROR";

export interface ImportIpcError {
  code: ImportIpcErrorCode;
  message: string;
}

export type ImportIpcResult<T> =
  | { success: true; data: T }
  | { success: false; error: ImportIpcError };

export interface SelectedPngFile {
  extension: string;
  fileName: string;
  filePath: string;
  fileSizeBytes: number;
}

export interface SelectSinglePngFileResult {
  canceled: boolean;
  file?: SelectedPngFile;
}

export type ImportPngWarningCode =
  | "DPI_METADATA_MISSING"
  | "DPI_BELOW_TARGET"
  | "IMAGE_TRIMMED"
  | "IMAGE_UPSCALED"
  | "IMAGE_UPSCALED_SOFT_QUALITY"
  | "HALFTONE_POSSIBLE"
  | "HALFTONE_LIKELY"
  | "PRINT_SIZE_NORMALIZED"
  | "PRINT_SIZE_BELOW_PREFERRED"
  | "PRINT_SIZE_SMALL_FORMAT"
  | "PRINT_SIZE_TERRIBLE";

export type PngDpiSource = "pHYs";

export interface ImportPngWarning {
  code: ImportPngWarningCode;
  message: string;
  details?: {
    dpi?: number;
    dpiX?: number;
    dpiY?: number;
    originalWidth?: number;
    originalHeight?: number;
    trimmedWidth?: number;
    trimmedHeight?: number;
    upscaledWidth?: number;
    upscaledHeight?: number;
    upscaleScaleFactor?: number;
  };
}

export interface ValidateSelectedPngFileResult {
  dpiSource?: PngDpiSource;
  dpiX?: number;
  dpiY?: number;
  fileName: string;
  filePath: string;
  fileSizeBytes: number;
  hasDpiMetadata: boolean;
  height: number;
  printSizeAssessment: PrintSizeAssessment;
  valid: boolean;
  warnings: ImportPngWarning[];
  width: number;
  /** True when transparent edge padding was trimmed from the image during import. */
  wasTrimmed?: boolean;
  /** True when the image's pixel data was upscaled during import under the image-quality policy. */
  wasUpscaled?: boolean;
  /** Present when wasTrimmed or wasUpscaled is true — the image's pixel dimensions before either correction. */
  originalWidth?: number;
  originalHeight?: number;
  approvedMaxPrintWidthInches?: number;
  approvedMaxPrintHeightInches?: number;
  sizingPolicyVersion?: string;
  upscaleFactor?: number;
  upscalePassCount?: 0 | 1;
  halftoneDetection?: import("../halftone/halftone.types").HalftoneDetectionPersisted;
}

export interface ReadSelectedPngFileBytesDerivatives {
  thumbnailBytes: Uint8Array;
  previewBytes: Uint8Array;
  thumbnail: ThumbnailDerivativeMetadata;
  preview: PreviewDerivativeMetadata;
}

export interface ReadSelectedPngFileBytesResult {
  bytes: Uint8Array;
  fileName: string;
  filePath: string;
  fileSizeBytes: number;
  /** Present when includeDerivatives was true and generation succeeded */
  derivatives?: ReadSelectedPngFileBytesDerivatives;
  /**
   * Present when includeDerivatives was true but generation failed.
   * Original bytes are still returned — Step 5+ treats this as import success + pipeline failure.
   */
  derivativeError?: DerivativeGenerationFailure;
}

export type ImportOriginalUploadStatus = "complete";

export interface ImportOriginalUploadResult {
  catalogRecordCreated: boolean;
  designId: string;
  designTitle: string;
  fileName: string;
  fileSizeBytes: number;
  originalPath: string;
  status: ImportOriginalUploadStatus;
  /** Firestore design status after import completes */
  finalStatus: ImportFinalDesignStatus;
  /** Derivative pipeline outcome for Phase 3C */
  derivativeStatus: ImportDerivativeStatus;
  /** Original uploaded and Firestore record created */
  importSuccess: boolean;
  /** Thumbnail and preview uploaded and paths saved; design remains imported until AI review */
  pipelineSuccess: boolean;
  thumbnailPath?: string;
  previewPath?: string;
  derivativeError?: string;
  cleanupWarning?: string | null;
  /** Set when automatic AI enqueue fails after successful import */
  aiEnqueueError?: string | null;
}

export interface SelectedPngPreviewResult {
  dataUrl: string;
  previewHeight: number;
  previewWidth: number;
}

export type SelectedPngPreviewRequest = string | ReadBatchValidatedPngFileBytesRequest;

export interface SelectMultiplePngFilesResult {
  canceled: boolean;
  jobId?: BatchImportJobId;
  sourceType?: "multiple-png";
  fileCount?: number;
  fileNames?: string[];
}

export interface SelectImportFolderResult {
  canceled: boolean;
  jobId?: BatchImportJobId;
  sourceType?: "folder";
  folderName?: string;
}

export interface SelectImportZipFileResult {
  canceled: boolean;
  jobId?: BatchImportJobId;
  sourceType?: "zip";
  fileName?: string;
  fileSizeBytes?: number;
}

export interface StartBatchDiscoveryRequest {
  jobId: BatchImportJobId;
  sourceType: BatchImportSourceType;
}

export interface StartBatchDiscoveryResult {
  jobId: BatchImportJobId;
  accepted: boolean;
  message?: string;
}

export interface CancelBatchImportJobRequest {
  jobId: BatchImportJobId;
}

export interface CancelBatchImportJobResult {
  jobId: BatchImportJobId;
  canceled: boolean;
}

export interface FinishBatchImportJobRequest {
  jobId: BatchImportJobId;
}

export interface FinishBatchImportJobResult {
  jobId: BatchImportJobId;
  tempDirDeleted: boolean;
  sessionCleared: boolean;
}

export interface ClearSinglePngImportResult {
  cleared: boolean;
}

export interface FreshPrintsImportsApi {
  selectSinglePngFile(): Promise<ImportIpcResult<SelectSinglePngFileResult>>;
  validateSelectedPngFile(filePath: string): Promise<ImportIpcResult<ValidateSelectedPngFileResult>>;
  clearSinglePngImport(): Promise<ImportIpcResult<ClearSinglePngImportResult>>;
  readSelectedPngFileBytes(
    request: ReadSelectedPngFileBytesRequest,
  ): Promise<ImportIpcResult<ReadSelectedPngFileBytesResult>>;
  getSelectedPngPreview(
    request: SelectedPngPreviewRequest,
  ): Promise<ImportIpcResult<SelectedPngPreviewResult>>;
  selectMultiplePngFiles(): Promise<ImportIpcResult<SelectMultiplePngFilesResult>>;
  selectImportFolder(): Promise<ImportIpcResult<SelectImportFolderResult>>;
  selectImportZip(): Promise<ImportIpcResult<SelectImportZipFileResult>>;
  startBatchDiscovery(
    request: StartBatchDiscoveryRequest,
  ): Promise<ImportIpcResult<StartBatchDiscoveryResult>>;
  cancelBatchJob(
    request: CancelBatchImportJobRequest,
  ): Promise<ImportIpcResult<CancelBatchImportJobResult>>;
  finishBatchJob(
    request: FinishBatchImportJobRequest,
  ): Promise<ImportIpcResult<FinishBatchImportJobResult>>;
  onBatchProgress(callback: (event: BatchImportProgressEvent) => void): () => void;
  onBatchDiscoveryComplete(callback: (event: BatchDiscoveryCompleteEvent) => void): () => void;
  onBatchJobError(callback: (event: BatchJobErrorEvent) => void): () => void;
  /** Dev-only — available when the Electron app is not packaged */
  verifyDerivativeGeneration(): Promise<ImportIpcResult<DerivativeGenerationVerificationResult>>;
}

export interface FreshPrintsPreloadApi {
  app: FreshPrintsAppApi;
  imports: FreshPrintsImportsApi;
  inboxAlert: FreshPrintsInboxAlertApi;
  whatnotImport: FreshPrintsWhatnotImportApi;
  export: FreshPrintsExportApi;
}
