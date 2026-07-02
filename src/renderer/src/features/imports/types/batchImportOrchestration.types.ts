import type {
  BatchDiscoveryCompleteEvent,
  BatchImportSourceType,
  BatchImportJobId,
} from "../../../../../../shared/types/import/batchImport.types";
import type {
  FinishBatchImportJobResult,
  ImportPngWarning,
} from "../../../../../../shared/types/import/importIpc.types";
import type {
  ImportDerivativeStatus,
  ImportFinalDesignStatus,
} from "../../../../../../shared/types/import/importOrchestration.types";

export type BatchUploadFileStatus = "success" | "failed" | "skipped";

export type BatchUploadPhase = "uploading" | "creating" | "completing" | "complete";

export interface BatchImportUploadFileResult {
  cleanupWarning?: string;
  designId?: string;
  derivativeError?: string;
  derivativeStatus?: ImportDerivativeStatus;
  errorMessage?: string;
  excludedByUser?: boolean;
  fileName: string;
  finalStatus?: ImportFinalDesignStatus;
  importSuccess?: boolean;
  pipelineSuccess?: boolean;
  previewPath?: string;
  relativePath?: string;
  skipReason?: string;
  sourceType: BatchImportSourceType;
  status: BatchUploadFileStatus;
  storagePath?: string;
  thumbnailPath?: string;
  aiEnqueueError?: string;
  warnings?: ImportPngWarning[];
}

export interface BatchImportUploadSummary {
  createdDesignIds: string[];
  derivativeCompleteCount: number;
  derivativeFailedCount: number;
  derivativeSkippedCount: number;
  failedFiles: Array<{
    errorMessage: string;
    fileName: string;
  }>;
  failedImports: number;
  skippedFiles: number;
  successfulImports: number;
  totalFiles: number;
  userSkippedCount: number;
  warningsCount: number;
  aiEnqueueFailedCount: number;
}

export interface BatchImportUploadReport {
  canceled: boolean;
  completedAt: string;
  files: BatchImportUploadFileResult[];
  finishBatchJob?: FinishBatchImportJobResult;
  jobId: BatchImportJobId;
  sourceType: BatchImportSourceType;
  startedAt: string;
  summary: BatchImportUploadSummary;
}

export interface BatchImportUploadProgress {
  completedCount: number;
  currentFileName: string;
  failureCount: number;
  phase: BatchUploadPhase;
  stepLabel?: string;
  successCount: number;
  totalCount: number;
}

export interface RunBatchImportUploadInput {
  caller: import("../../users/types/user.types").User;
  discovery: BatchDiscoveryCompleteEvent;
  excludedFilePaths?: ReadonlySet<string>;
  onProgress?: (progress: BatchImportUploadProgress) => void;
  cancelToken?: import("../utils/uploadCancelToken").UploadCancelToken;
}
