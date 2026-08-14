import type {
  BatchDiscoveryCompleteEvent,
  BatchImportProgressEvent,
} from "@fresh-prints/shared/types/import/batchImport.types";
import { buildBatchDiscoveryLimitWarning } from "@fresh-prints/shared/utils/batchDiscoverySummary";

import type { BatchImportUploadProgress } from "../types/batchImportOrchestration.types";
import type { BatchImportHookProgress } from "../types/batchImportHook.types";

export function mapDiscoveryProgressToHookProgress(
  event: BatchImportProgressEvent,
): BatchImportHookProgress {
  return {
    phase: event.phase,
    currentFileName: event.currentFileName,
    completedCount: event.fileIndex,
    totalCount: event.fileTotal,
    successCount: event.counts.success,
    failureCount: event.counts.failed + event.counts.rejected,
  };
}

export function mapUploadProgressToHookProgress(
  event: BatchImportUploadProgress,
): BatchImportHookProgress {
  return {
    phase: event.phase,
    currentFileName: event.currentFileName,
    completedCount: event.completedCount,
    totalCount: event.totalCount,
    successCount: event.successCount,
    failureCount: event.failureCount,
    stepLabel: event.stepLabel,
  };
}

export function buildUploadWarning(report: {
  summary: {
    warningsCount: number;
    failedImports: number;
    derivativeFailedCount: number;
  };
}): string | null {
  const messages: string[] = [];

  if (report.summary.failedImports > 0) {
    messages.push(
      `${report.summary.failedImports} file(s) failed to import. See the upload report for details.`,
    );
  }

  if (report.summary.derivativeFailedCount > 0) {
    messages.push(
      `${report.summary.derivativeFailedCount} design(s) were imported (original saved) but derivative ` +
        `processing failed — automatic AI did not start for those designs.`,
    );
  }

  if (report.summary.warningsCount > 0) {
    messages.push(`${report.summary.warningsCount} validation warning(s) were recorded.`);
  }

  return messages.length > 0 ? messages.join(" ") : null;
}

export function buildTruncatedDiscoveryWarning(event: BatchDiscoveryCompleteEvent): string | null {
  return buildBatchDiscoveryLimitWarning(event);
}
