import type { WebContents } from "electron";

import type {
  BatchDiscoveryCompleteEvent,
  BatchImportFileManifestEntry,
  BatchImportProgressEvent,
  BatchImportSourceType,
  FolderBatchDiscoverySummary,
} from "@fresh-prints/shared/types/import/batchImport.types";
import { buildBatchDiscoverySummary } from "@fresh-prints/shared/utils/batchDiscoverySummary";
import { emitBatchDiscoveryComplete, emitBatchImportProgress } from "./batchImportEvents";

export function buildProgressCounts(files: BatchImportFileManifestEntry[]) {
  const validated = files.filter((file) => file.outcome === "validated").length;
  const rejected = files.filter((file) => file.outcome === "rejected").length;

  return {
    success: validated,
    failed: 0,
    rejected,
    skipped: 0,
  };
}

function buildProgressEventKey(event: BatchImportProgressEvent): string {
  return [
    event.jobId,
    event.phase,
    event.fileIndex,
    event.fileTotal,
    event.status,
    event.currentFileName,
    event.message ?? "",
    event.counts.success,
    event.counts.rejected,
    event.counts.failed,
    event.counts.skipped,
  ].join("|");
}

export function createDiscoveryProgressEmitter(webContents: WebContents) {
  let lastEventKey = "";

  return function emitDiscoveryProgress(event: BatchImportProgressEvent): void {
    const eventKey = buildProgressEventKey(event);

    if (eventKey === lastEventKey) {
      return;
    }

    lastEventKey = eventKey;
    emitBatchImportProgress(webContents, event);
  };
}

export function emitDiscoveryFinished(
  webContents: WebContents,
  emitDiscoveryProgress: (event: BatchImportProgressEvent) => void,
  input: {
    canceled: boolean;
    fileTotal: number;
    files: BatchImportFileManifestEntry[];
    folderDiscovery?: FolderBatchDiscoverySummary;
    jobId: string;
    pngsDiscovered: number;
    sourceType: BatchImportSourceType;
    truncated: boolean;
  },
): void {
  const { canceled, fileTotal, files, folderDiscovery, jobId, pngsDiscovered, sourceType, truncated } =
    input;

  const summary = buildBatchDiscoverySummary(files, pngsDiscovered, folderDiscovery);

  const completeEvent: BatchDiscoveryCompleteEvent = {
    jobId,
    canceled,
    truncated,
    sourceType,
    summary,
    folderDiscovery,
    files,
  };

  emitDiscoveryProgress({
    jobId,
    phase: "complete",
    fileIndex: canceled ? files.length : fileTotal,
    fileTotal,
    currentFileName: "",
    status: canceled ? "cancelled" : "success",
    message: canceled ? "Batch discovery canceled" : "Batch discovery complete",
    counts: buildProgressCounts(files),
  });

  emitBatchDiscoveryComplete(webContents, completeEvent);
}
