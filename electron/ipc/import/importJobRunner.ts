import type { WebContents } from "electron";

import type { BatchImportSourceType } from "../../../shared/types/import/batchImport.types";
import type { BatchJobErrorEvent } from "../../../shared/types/import/batchImport.types";
import { deleteJobTempDir } from "../../services/import/tempDirectoryService";
import { ZipExtractionError } from "../../services/import/zipExtractionErrors";
import { emitBatchJobError } from "./batchImportEvents";
import { BatchDiscoveryFatalError } from "./batchDiscoveryFatalError";
import {
  completeBatchImportDiscovery,
  failBatchImportDiscovery,
  markBatchImportSessionDiscovering,
} from "./importBatchSession";
import { runFolderBatchDiscovery } from "./folderBatchDiscovery";
import { mapZipExtractionErrorToJobError } from "./mapZipExtractionErrorToJobError";
import { runMultiplePngBatchDiscovery } from "./multiplePngBatchDiscovery";
import { runZipBatchDiscovery } from "./zipBatchDiscovery";

export interface StartBatchImportDiscoveryInput {
  jobId: string;
  sourceType: BatchImportSourceType;
  webContents: WebContents;
}

function createTerminalGuard(jobId: string, webContents: WebContents) {
  let terminalEventEmitted = false;

  return {
    async emitFatalError(error: BatchJobErrorEvent, cleanupZipTemp: boolean): Promise<void> {
      if (terminalEventEmitted) {
        return;
      }

      terminalEventEmitted = true;

      if (cleanupZipTemp) {
        try {
          await deleteJobTempDir(jobId);
        } catch {
          // Best-effort ZIP temp cleanup after fatal discovery errors.
        }
      }

      failBatchImportDiscovery(jobId);
      emitBatchJobError(webContents, error);
    },
  };
}

function mapDiscoveryError(
  jobId: string,
  sourceType: BatchImportSourceType,
  error: unknown,
): { event: BatchJobErrorEvent; cleanupZipTemp: boolean } {
  if (error instanceof BatchDiscoveryFatalError) {
    return {
      event: {
        jobId,
        code: error.code,
        message: error.message,
      },
      cleanupZipTemp: error.cleanupZipTemp,
    };
  }

  if (error instanceof ZipExtractionError) {
    return {
      event: mapZipExtractionErrorToJobError(jobId, error),
      cleanupZipTemp: true,
    };
  }

  const message =
    error instanceof Error
      ? error.message
      : "An unexpected error occurred during batch discovery.";

  return {
    event: {
      jobId,
      code: "INTERNAL_ERROR",
      message,
    },
    cleanupZipTemp: sourceType === "zip",
  };
}

async function runSourceDiscovery(
  jobId: string,
  webContents: WebContents,
  sourceType: BatchImportSourceType,
): Promise<boolean> {
  switch (sourceType) {
    case "multiple-png":
      return runMultiplePngBatchDiscovery(jobId, webContents);
    case "folder":
      return runFolderBatchDiscovery(jobId, webContents);
    case "zip":
      return runZipBatchDiscovery(jobId, webContents);
    default:
      throw new BatchDiscoveryFatalError(
        "INVALID_INPUT",
        "The batch import source type is not supported.",
      );
  }
}

export async function runBatchImportDiscovery(input: StartBatchImportDiscoveryInput): Promise<void> {
  const { jobId, sourceType, webContents } = input;
  const terminalGuard = createTerminalGuard(jobId, webContents);

  if (!markBatchImportSessionDiscovering(jobId)) {
    await terminalGuard.emitFatalError(
      {
        jobId,
        code: "INVALID_INPUT",
        message: "The batch import session is no longer ready for discovery.",
      },
      false,
    );
    return;
  }

  try {
    const canceled = await runSourceDiscovery(jobId, webContents, sourceType);
    completeBatchImportDiscovery(jobId, canceled);
  } catch (error) {
    const mapped = mapDiscoveryError(jobId, sourceType, error);
    await terminalGuard.emitFatalError(mapped.event, mapped.cleanupZipTemp);
  }
}
