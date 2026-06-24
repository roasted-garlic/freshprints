import type { ImportPngWarning, ValidateSelectedPngFileResult } from "./importIpc.types";

export type BatchImportSessionStatus = "selected" | "discovering" | "cancelled" | "failed" | "finished";

export interface BatchImportSessionRecord {
  jobId: string;
  webContentsId: number;
  sourceType: BatchImportSourceType;
  filePaths?: string[];
  folderPath?: string;
  zipFilePath?: string;
  createdAt: string;
  status: BatchImportSessionStatus;
}

export type BatchImportJobId = string;

export type BatchImportSourceType = "multiple-png" | "folder" | "zip";

export type BatchImportJobStatus =
  | "idle"
  | "selecting"
  | "discovering"
  | "validating"
  | "uploading"
  | "completing"
  | "done"
  | "cancelled"
  | "failed";

export type BatchImportPhase =
  | "discovering"
  | "validating"
  | "uploading"
  | "creating"
  | "complete";

export type BatchImportFileOutcome = "validated" | "rejected" | "skipped";

export type BatchImportFileStatus =
  | "pending"
  | "running"
  | "success"
  | "rejected"
  | "failed"
  | "skipped"
  | "cancelled";

export type BatchImportFileResultOutcome =
  | "imported"
  | "failed"
  | "rejected"
  | "skipped"
  | "cancelled";

export type ImportFileRejectionReasonCode =
  | "INVALID_PNG"
  | "FILE_TOO_LARGE"
  | "FILE_NOT_FOUND"
  | "READ_ERROR"
  | "VALIDATION_ERROR"
  | "ZIP_EXTRACTED_SIZE_EXCEEDED"
  | "DPI_TOO_LOW"
  | "DIMENSION_OUT_OF_BOUNDS"
  | "PRINT_SIZE_INSUFFICIENT";

export interface ImportFileRejection {
  reasonCode: ImportFileRejectionReasonCode;
  message: string;
  details?: {
    width?: number;
    height?: number;
    dpi?: number;
  };
}

/** Discovery-phase row for a PNG candidate (selected, folder-scanned, or ZIP-extracted). */
export interface BatchImportFileManifestEntry {
  filePath: string;
  displayName: string;
  relativePath?: string;
  fileSizeBytes: number;
  sourceType: BatchImportSourceType;
  outcome: BatchImportFileOutcome;
  validation?: ValidateSelectedPngFileResult;
  rejection?: ImportFileRejection;
  skipReason?: string;
}

export interface BatchDiscoverySummary {
  discovered: number;
  skipped: number;
  rejected: number;
  validated: number;
}

/** Main-process event payload when discovery and validation complete. */
export interface BatchDiscoveryCompleteEvent {
  jobId: BatchImportJobId;
  canceled: boolean;
  truncated: boolean;
  sourceType: BatchImportSourceType;
  summary: BatchDiscoverySummary;
  files: BatchImportFileManifestEntry[];
}

/** Main-process progress event during discovery and validation. */
export interface BatchImportProgressEvent {
  jobId: BatchImportJobId;
  phase: BatchImportPhase;
  fileIndex: number;
  fileTotal: number;
  currentFileName: string;
  status: BatchImportFileStatus;
  message?: string;
  counts: {
    success: number;
    failed: number;
    rejected: number;
    skipped: number;
  };
}

/** Main-process fatal batch job error event. */
export interface BatchJobErrorEvent {
  jobId: BatchImportJobId;
  code: string;
  message: string;
}

/** Renderer-assembled per-file outcome after upload and Firestore create. */
export interface BatchImportFileResult {
  displayName: string;
  outcome: BatchImportFileResultOutcome;
  designId?: string;
  designTitle?: string;
  message?: string;
  warnings?: ImportPngWarning[];
}

/** Renderer-assembled summary after a batch job completes. */
export interface BatchImportFinalReport {
  jobId: BatchImportJobId;
  sourceType: BatchImportSourceType;
  startedAt: string;
  completedAt: string;
  canceled: boolean;
  totals: {
    discovered: number;
    imported: number;
    failed: number;
    rejected: number;
    skipped: number;
  };
  files: BatchImportFileResult[];
}

/** Renderer hook state for an active or completed batch import job. */
export interface BatchImportJobState {
  jobId: BatchImportJobId | null;
  status: BatchImportJobStatus;
  sourceType: BatchImportSourceType | null;
  progress: BatchImportProgressEvent | null;
  discovery: BatchDiscoveryCompleteEvent | null;
  error: BatchJobErrorEvent | null;
  report: BatchImportFinalReport | null;
}

export function createInitialBatchImportJobState(): BatchImportJobState {
  return {
    jobId: null,
    status: "idle",
    sourceType: null,
    progress: null,
    discovery: null,
    error: null,
    report: null,
  };
}
