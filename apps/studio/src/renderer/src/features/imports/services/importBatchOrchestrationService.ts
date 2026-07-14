import { UPLOAD_CONCURRENCY } from "@fresh-prints/shared/constants/import/batchImportLimits.constants";
import type { BatchImportFileManifestEntry } from "@fresh-prints/shared/types/import/batchImport.types";

import type {
  BatchImportUploadFileResult,
  BatchImportUploadProgress,
  BatchImportUploadReport,
  RunBatchImportUploadInput,
} from "../types/batchImportOrchestration.types";
import { runWithConcurrency } from "../utils/runWithConcurrency";
import { importDesktopService } from "./importDesktopService";
import {
  importValidatedPngFile,
  type ImportValidatedPngFileResult,
} from "./importOrchestrationService";

const USER_EXCLUDED_SKIP_REASON = "Excluded from upload by user.";

function buildSkippedResult(
  entry: BatchImportFileManifestEntry,
  reason?: string,
): BatchImportUploadFileResult {
  return {
    fileName: entry.displayName,
    relativePath: entry.relativePath,
    sourceType: entry.sourceType,
    status: "skipped",
    derivativeStatus: "skipped",
    skipReason:
      reason ?? entry.rejection?.message ?? entry.skipReason ?? "File was not validated for import.",
  };
}

function buildUserExcludedResult(entry: BatchImportFileManifestEntry): BatchImportUploadFileResult {
  return {
    fileName: entry.displayName,
    relativePath: entry.relativePath,
    sourceType: entry.sourceType,
    status: "skipped",
    excludedByUser: true,
    derivativeStatus: "skipped",
    skipReason: USER_EXCLUDED_SKIP_REASON,
    warnings: entry.validation?.warnings,
  };
}

function mapImportOutcomeToBatchFileResult(
  entry: BatchImportFileManifestEntry,
  outcome: ImportValidatedPngFileResult,
): BatchImportUploadFileResult {
  if (outcome.status === "failed") {
    return {
      fileName: entry.displayName,
      relativePath: entry.relativePath,
      sourceType: entry.sourceType,
      status: "failed",
      importSuccess: false,
      pipelineSuccess: false,
      derivativeStatus: "failed",
      finalStatus: "imported",
      errorMessage: outcome.message,
      cleanupWarning: outcome.cleanupWarning ?? undefined,
      warnings: entry.validation?.warnings,
    };
  }

  const upload = outcome.uploadResult;

  return {
    fileName: entry.displayName,
    relativePath: entry.relativePath,
    sourceType: entry.sourceType,
    status: "success",
    designId: upload.designId,
    storagePath: upload.originalPath,
    warnings: outcome.warnings,
    importSuccess: upload.importSuccess,
    pipelineSuccess: upload.pipelineSuccess,
    derivativeStatus: upload.derivativeStatus,
    finalStatus: upload.finalStatus,
    thumbnailPath: upload.thumbnailPath,
    previewPath: upload.previewPath,
    derivativeError: upload.derivativeError,
    cleanupWarning: upload.cleanupWarning ?? undefined,
    aiEnqueueError: upload.aiEnqueueError ?? undefined,
  };
}

function countWarnings(files: BatchImportUploadFileResult[]): number {
  return files.reduce((total, file) => total + (file.warnings?.length ?? 0), 0);
}

function emitUploadProgress(
  onProgress: RunBatchImportUploadInput["onProgress"],
  progress: BatchImportUploadProgress,
): void {
  onProgress?.(progress);
}

function buildBatchSummary(files: BatchImportUploadFileResult[]) {
  const successfulImports = files.filter((file) => file.status === "success");
  const failedImports = files.filter((file) => file.status === "failed");
  const userSkippedCount = files.filter((file) => file.excludedByUser === true).length;
  const skippedFiles = files.filter(
    (file) => file.status === "skipped" && file.excludedByUser !== true,
  ).length;

  const derivativeCompleteCount = files.filter((file) => file.pipelineSuccess === true).length;
  const derivativeFailedCount = files.filter(
    (file) => file.importSuccess === true && file.pipelineSuccess === false,
  ).length;
  const derivativeSkippedCount = files.filter((file) => file.derivativeStatus === "skipped").length;
  const aiEnqueueFailedCount = files.filter((file) => Boolean(file.aiEnqueueError?.trim())).length;

  return {
    totalFiles: files.length,
    successfulImports: successfulImports.length,
    failedImports: failedImports.length,
    skippedFiles,
    userSkippedCount,
    warningsCount: countWarnings(files),
    derivativeCompleteCount,
    derivativeFailedCount,
    derivativeSkippedCount,
    aiEnqueueFailedCount,
    createdDesignIds: successfulImports
      .map((file) => file.designId)
      .filter((designId): designId is string => Boolean(designId)),
    failedFiles: failedImports.map((file) => ({
      fileName: file.fileName,
      errorMessage: file.errorMessage ?? "Import failed.",
    })),
  };
}

export const importBatchOrchestrationService = {
  async runBatchUpload(input: RunBatchImportUploadInput): Promise<BatchImportUploadReport> {
    const { caller, discovery, excludedFilePaths, onProgress, onDesignPipelineSuccess, cancelToken } =
      input;
    const excludedPaths = excludedFilePaths ?? new Set<string>();
    const startedAt = new Date().toISOString();

    const validatedEntries = discovery.files
      .map((entry, index) => ({ entry, index }))
      .filter(
        (item): item is { entry: BatchImportFileManifestEntry; index: number } =>
          item.entry.outcome === "validated" && Boolean(item.entry.validation),
      );

    const totalCount = discovery.files.length;
    const skippedCount = totalCount - validatedEntries.length;
    let completedCount = skippedCount;
    let successCount = 0;
    let failureCount = 0;

    const uploadResultsByIndex = new Map<number, BatchImportUploadFileResult>();

    for (const { entry, index } of validatedEntries) {
      if (excludedPaths.has(entry.filePath)) {
        uploadResultsByIndex.set(index, buildUserExcludedResult(entry));
        completedCount += 1;
      }
    }

    const includedValidatedEntries = validatedEntries.filter(
      ({ entry }) => !excludedPaths.has(entry.filePath),
    );

    emitUploadProgress(onProgress, {
      phase: "uploading",
      currentFileName: "",
      completedCount,
      totalCount,
      successCount,
      failureCount,
      stepLabel: "Preparing batch upload and derivative processing...",
    });

    if (!discovery.canceled && includedValidatedEntries.length > 0) {
      const uploadResults = await runWithConcurrency(
        includedValidatedEntries,
        UPLOAD_CONCURRENCY,
        async ({ entry, index }) => {
          const validation = entry.validation;

          if (!validation) {
            return {
              index,
              result: buildSkippedResult(entry),
            };
          }

          if (cancelToken?.isCancelled) {
            return {
              index,
              result: buildSkippedResult(entry, "Batch import was canceled before this file's upload started."),
            };
          }

          emitUploadProgress(onProgress, {
            phase: "uploading",
            currentFileName: entry.displayName,
            completedCount,
            totalCount,
            successCount,
            failureCount,
            stepLabel: "Generating derivatives and uploading original PNG...",
          });

          const outcome = await importValidatedPngFile(caller, validation, {
            jobId: discovery.jobId,
            cancelToken,
          });

          const result = mapImportOutcomeToBatchFileResult(entry, outcome);

          if (result.status === "success") {
            successCount += 1;
          } else {
            failureCount += 1;
          }

          completedCount += 1;

          const designId = result.designId?.trim();
          if (result.pipelineSuccess === true && designId) {
            onDesignPipelineSuccess?.(designId);
          }

          emitUploadProgress(onProgress, {
            phase: result.pipelineSuccess ? "creating" : "uploading",
            currentFileName: entry.displayName,
            completedCount,
            totalCount,
            successCount,
            failureCount,
            stepLabel: result.pipelineSuccess
              ? "Derivative paths saved. Design remains imported."
              : result.importSuccess
                ? "Design imported; derivative processing incomplete."
                : "Import failed for this file.",
          });

          return { index, result };
        },
      );

      for (const uploadResult of uploadResults) {
        uploadResultsByIndex.set(uploadResult.index, uploadResult.result);
      }
    } else if (discovery.canceled) {
      for (const { entry, index } of validatedEntries) {
        uploadResultsByIndex.set(
          index,
          buildSkippedResult(entry, "Batch import was canceled before upload."),
        );
      }
    }

    const orderedResults: BatchImportUploadFileResult[] = discovery.files.map((entry, index) => {
      const uploadResult = uploadResultsByIndex.get(index);

      if (uploadResult) {
        return uploadResult;
      }

      return buildSkippedResult(entry);
    });

    emitUploadProgress(onProgress, {
      phase: "completing",
      currentFileName: "",
      completedCount: totalCount,
      totalCount,
      successCount,
      failureCount,
      stepLabel: "Finishing batch job and cleaning up temporary files...",
    });

    const finishBatchJobResult = await importDesktopService.finishBatchJob({
      jobId: discovery.jobId,
    });

    if (!finishBatchJobResult.success) {
      console.error("Batch import finishBatchJob failed:", finishBatchJobResult.error.message);
    }

    const completedAt = new Date().toISOString();
    const summary = buildBatchSummary(orderedResults);

    emitUploadProgress(onProgress, {
      phase: "complete",
      currentFileName: "",
      completedCount: totalCount,
      totalCount,
      successCount: summary.successfulImports,
      failureCount: summary.failedImports,
      stepLabel: "Batch import complete.",
    });

    return {
      jobId: discovery.jobId,
      sourceType: discovery.sourceType,
      startedAt,
      completedAt,
      canceled: discovery.canceled,
      files: orderedResults,
      finishBatchJob: finishBatchJobResult.success ? finishBatchJobResult.data : undefined,
      summary,
    };
  },
};
