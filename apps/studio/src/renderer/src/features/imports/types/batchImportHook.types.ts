import type {
  BatchDiscoveryCompleteEvent,
  BatchImportPhase,
  BatchImportSourceType,
  BatchImportJobId,
  BatchJobErrorEvent,
} from "@fresh-prints/shared/types/import/batchImport.types";

import type { BatchImportUploadReport } from "./batchImportOrchestration.types";
import type { ImportSessionSettings } from "../constants/importSessionSettings";
import type { ImportItemBackgroundOverride } from "@fresh-prints/shared/utils/resolveImportArtworkBackgroundDecision";
import type { ImportItemHalftoneOverride } from "@fresh-prints/shared/utils/resolveImportArtworkBackgroundDecision";

export type BatchImportHookPhase =
  | "idle"
  | "selecting"
  | "discovering"
  | "ready-to-upload"
  | "uploading"
  | "completed"
  | "error";

export type BatchImportHookProgressPhase =
  | BatchImportPhase
  | "completing"
  | "complete";

export interface BatchImportHookProgress {
  phase: BatchImportHookProgressPhase;
  currentFileName: string;
  completedCount: number;
  totalCount: number;
  successCount: number;
  failureCount: number;
  stepLabel?: string;
}

export interface UseBatchImportState {
  phase: BatchImportHookPhase;
  isBusy: boolean;
  jobId: BatchImportJobId | null;
  sourceType: BatchImportSourceType | null;
  discoveryResult: BatchDiscoveryCompleteEvent | null;
  uploadReport: BatchImportUploadReport | null;
  error: string | null;
  warning: string | null;
  progress: BatchImportHookProgress | null;
  /** Validated file paths excluded from upload before batch starts (UI state only). */
  excludedFilePaths: string[];
  /** Per-file Auto detector hints from preview IPC (filePath → dark). */
  suggestDarkByPath: Record<string, boolean>;
  /** Per-file quick picker (filePath → auto|light|dark). Missing = auto. */
  itemBackgroundOverrides: Record<string, ImportItemBackgroundOverride>;
  /** Per-file halftone toggle (filePath → auto|on|off). Missing = auto. */
  itemHalftoneOverrides: Record<string, ImportItemHalftoneOverride>;
}

export interface UseBatchImportActions {
  selectMultiplePngs: () => Promise<void>;
  selectFolder: () => Promise<void>;
  selectZip: () => Promise<void>;
  uploadBatch: () => Promise<void>;
  /** Clears the batch workflow, releases the main-process session, and returns to idle. */
  cancelImport: () => Promise<void>;
  /** @deprecated Use cancelImport */
  reset: () => Promise<void>;
  toggleFileIncluded: (filePath: string) => void;
  includeAllValidatedFiles: () => void;
  excludeAllValidatedFiles: () => void;
  setItemBackgroundOverride: (
    filePath: string,
    value: ImportItemBackgroundOverride,
  ) => void;
  setItemHalftoneOverride: (
    filePath: string,
    value: ImportItemHalftoneOverride,
  ) => void;
  recordSuggestDarkForFile: (filePath: string, suggestDark: boolean) => void;
}

export type UseBatchImportReturn = UseBatchImportState &
  UseBatchImportActions & {
    canUpload: boolean;
  };

export type BatchImportFatalError = BatchJobErrorEvent;

export type UseBatchImportOptions = {
  /** Page-visit import settings (single + batch). Defaults to normal / auto. */
  getSessionSettings?: () => ImportSessionSettings;
};
