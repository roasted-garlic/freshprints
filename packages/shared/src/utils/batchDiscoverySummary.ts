import { MAX_BATCH_FILES } from "../constants/import/batchImportLimits.constants";
import type {
  BatchDiscoveryCompleteEvent,
  BatchDiscoverySummary,
  BatchImportFileManifestEntry,
  FolderBatchDiscoverySummary,
} from "../types/import/batchImport.types";

export function countProcessedDiscoveryFiles(files: BatchImportFileManifestEntry[]): number {
  return files.filter((file) => file.outcome === "validated" || file.outcome === "rejected").length;
}

export function buildBatchDiscoverySummary(
  files: BatchImportFileManifestEntry[],
  pngsDiscovered: number,
  folderDiscovery?: FolderBatchDiscoverySummary,
): BatchDiscoverySummary {
  const validated = files.filter((file) => file.outcome === "validated").length;
  const rejected = files.filter((file) => file.outcome === "rejected").length;
  const processed = validated + rejected;
  const skippedByLimit = Math.max(0, pngsDiscovered - processed);

  return {
    discovered: pngsDiscovered,
    processed,
    skippedByLimit,
    skipped: folderDiscovery?.zipsSkipped ?? 0,
    rejected,
    validated,
  };
}

export function buildDiscoverySummaryHelpText(
  maxBatchFiles: number = MAX_BATCH_FILES,
): string {
  return `Discovered counts PNGs found in folders and ZIPs. Only up to ${maxBatchFiles} PNGs are processed per batch.`;
}

export function buildBatchDiscoveryLimitWarning(
  event: Pick<BatchDiscoveryCompleteEvent, "summary" | "folderDiscovery" | "truncated">,
  maxBatchFiles: number = MAX_BATCH_FILES,
): string | null {
  const { summary, folderDiscovery, truncated } = event;

  if (!truncated && summary.skippedByLimit === 0 && (folderDiscovery?.zipsSkippedByLimit ?? 0) === 0) {
    return null;
  }

  const parts: string[] = [
    `Found ${summary.discovered} PNG${summary.discovered === 1 ? "" : "s"}; processed ${summary.processed} (batch limit ${maxBatchFiles}).`,
  ];

  if (summary.skippedByLimit > 0) {
    parts.push(
      `${summary.skippedByLimit} PNG${summary.skippedByLimit === 1 ? "" : "s"} were not imported.`,
    );
  }

  const zipsSkippedByLimit = folderDiscovery?.zipsSkippedByLimit ?? 0;
  const zipsSkippedOther = folderDiscovery?.zipsSkippedOther ?? 0;

  if (zipsSkippedByLimit > 0) {
    parts.push(
      `${zipsSkippedByLimit} ZIP archive${zipsSkippedByLimit === 1 ? "" : "s"} were not opened because the batch was full.`,
    );
  }

  if (zipsSkippedOther > 0) {
    parts.push(
      `${zipsSkippedOther} ZIP archive${zipsSkippedOther === 1 ? "" : "s"} were skipped (size limit, folder ZIP cap, or extraction error).`,
    );
  }

  return parts.join(" ");
}
