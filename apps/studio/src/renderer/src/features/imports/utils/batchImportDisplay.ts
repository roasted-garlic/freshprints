import type {
  BatchDiscoveryCompleteEvent,
  BatchImportFileManifestEntry,
  BatchImportSourceType,
} from "@fresh-prints/shared/types/import/batchImport.types";

import type {
  BatchImportHookPhase,
  BatchImportHookProgress,
} from "../types/batchImportHook.types";

const FILE_LIST_PREVIEW_LIMIT = 12;

export function getBatchSourceTypeLabel(sourceType: BatchImportSourceType): string {
  switch (sourceType) {
    case "multiple-png":
      return "Multiple PNG files";
    case "folder":
      return "Folder";
    case "zip":
      return "ZIP archive";
    default:
      return sourceType;
  }
}

export function getBatchHookPhaseLabel(phase: BatchImportHookPhase): string {
  switch (phase) {
    case "idle":
      return "Idle";
    case "selecting":
      return "Selecting source";
    case "discovering":
      return "Discovering files";
    case "ready-to-upload":
      return "Ready to upload";
    case "uploading":
      return "Uploading batch";
    case "completed":
      return "Completed";
    case "error":
      return "Error";
    default:
      return phase;
  }
}

export function getBatchProgressPhaseLabel(
  phase: BatchImportHookProgress["phase"] | "selecting",
): string {
  switch (phase) {
    case "selecting":
      return "Selecting source";
    case "discovering":
      return "Discovering";
    case "validating":
      return "Validating";
    case "uploading":
      return "Uploading and processing derivatives";
    case "creating":
      return "Updating derivative paths";
    case "completing":
      return "Completing batch";
    case "complete":
      return "Complete";
    default:
      return phase;
  }
}

export function countFilesWithDiscoveryWarnings(files: BatchImportFileManifestEntry[]): number {
  return files.reduce((total, file) => {
    if (file.outcome === "validated" && file.validation && file.validation.warnings.length > 0) {
      return total + 1;
    }

    return total;
  }, 0);
}

export function countExcludedValidatedFiles(
  validatedFiles: BatchImportFileManifestEntry[],
  excludedFilePaths: ReadonlySet<string>,
): number {
  return validatedFiles.filter((file) => excludedFilePaths.has(file.filePath)).length;
}

export function countIncludedValidatedFiles(
  validatedFiles: BatchImportFileManifestEntry[],
  excludedFilePaths: ReadonlySet<string>,
): number {
  return validatedFiles.length - countExcludedValidatedFiles(validatedFiles, excludedFilePaths);
}

export function isValidatedFileIncluded(
  filePath: string,
  excludedFilePaths: ReadonlySet<string>,
): boolean {
  return !excludedFilePaths.has(filePath);
}

export function getValidatedManifestFiles(
  discovery: BatchDiscoveryCompleteEvent,
): BatchImportFileManifestEntry[] {
  return discovery.files.filter((file) => file.outcome === "validated");
}

export function getRejectedManifestFiles(
  discovery: BatchDiscoveryCompleteEvent,
): BatchImportFileManifestEntry[] {
  return discovery.files.filter((file) => file.outcome === "rejected");
}

export function sliceFileListPreview<T>(files: T[]): {
  items: T[];
  remainingCount: number;
} {
  if (files.length <= FILE_LIST_PREVIEW_LIMIT) {
    return { items: files, remainingCount: 0 };
  }

  return {
    items: files.slice(0, FILE_LIST_PREVIEW_LIMIT),
    remainingCount: files.length - FILE_LIST_PREVIEW_LIMIT,
  };
}

export function calculateProgressPercent(completedCount: number, totalCount: number): number {
  if (totalCount <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((completedCount / totalCount) * 100));
}
