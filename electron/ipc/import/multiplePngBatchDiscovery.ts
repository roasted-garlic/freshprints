import type { WebContents } from "electron";

import type { BatchImportFileManifestEntry } from "../../../shared/types/import/batchImport.types";
import {
  buildProgressCounts,
  createDiscoveryProgressEmitter,
  emitDiscoveryFinished,
} from "./batchDiscoveryHelpers";
import {
  getBatchSessionFilePaths,
  isBatchImportCancelRequested,
  registerBatchValidatedPath,
} from "./importBatchSession";
import { mapPngValidationFailureToRejection } from "./mapPngValidationFailureToRejection";
import { getFileName } from "./importPathUtils";
import { validatePngFile } from "./pngValidator";

export async function runMultiplePngBatchDiscovery(
  jobId: string,
  webContents: WebContents,
): Promise<boolean> {
  const emitDiscoveryProgress = createDiscoveryProgressEmitter(webContents);
  const filePaths = getBatchSessionFilePaths(jobId);
  const fileTotal = filePaths.length;
  const files: BatchImportFileManifestEntry[] = [];
  let canceled = false;

  emitDiscoveryProgress({
    jobId,
    phase: "discovering",
    fileIndex: 0,
    fileTotal,
    currentFileName: "",
    status: "running",
    message: "Starting batch discovery",
    counts: buildProgressCounts(files),
  });

  for (let index = 0; index < filePaths.length; index += 1) {
    if (isBatchImportCancelRequested(jobId)) {
      canceled = true;
      break;
    }

    const filePath = filePaths[index];
    const fileName = getFileName(filePath);

    try {
      const validation = await validatePngFile(filePath);

      registerBatchValidatedPath(jobId, filePath);

      files.push({
        filePath,
        displayName: validation.fileName,
        fileSizeBytes: validation.fileSizeBytes,
        sourceType: "multiple-png",
        outcome: "validated",
        validation,
      });
    } catch (error) {
      files.push({
        filePath,
        displayName: fileName,
        fileSizeBytes: 0,
        sourceType: "multiple-png",
        outcome: "rejected",
        rejection: mapPngValidationFailureToRejection(filePath, error),
      });
    }

    emitDiscoveryProgress({
      jobId,
      phase: "validating",
      fileIndex: index + 1,
      fileTotal,
      currentFileName: fileName,
      status: canceled
        ? "cancelled"
        : files.at(-1)?.outcome === "validated"
          ? "success"
          : "rejected",
      message: `Validated ${fileName}`,
      counts: buildProgressCounts(files),
    });
  }

  emitDiscoveryFinished(webContents, emitDiscoveryProgress, {
    canceled,
    fileTotal,
    files,
    jobId,
    pngsDiscovered: fileTotal,
    sourceType: "multiple-png",
    truncated: false,
  });

  return canceled;
}
