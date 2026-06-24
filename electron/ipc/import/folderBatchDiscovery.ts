import type { WebContents } from "electron";

import type { BatchImportFileManifestEntry } from "../../../shared/types/import/batchImport.types";
import { scanFolderForPngFiles } from "../../services/import/folderScanner";
import {
  buildProgressCounts,
  createDiscoveryProgressEmitter,
  emitDiscoveryFinished,
} from "./batchDiscoveryHelpers";
import { BatchDiscoveryFatalError } from "./batchDiscoveryFatalError";
import {
  getBatchSessionFolderPath,
  isBatchImportCancelRequested,
  registerBatchValidatedPath,
} from "./importBatchSession";
import { mapPngValidationFailureToRejection } from "./mapPngValidationFailureToRejection";
import { validatePngFile } from "./pngValidator";

export async function runFolderBatchDiscovery(
  jobId: string,
  webContents: WebContents,
): Promise<boolean> {
  const emitDiscoveryProgress = createDiscoveryProgressEmitter(webContents);
  const folderPath = getBatchSessionFolderPath(jobId);
  const files: BatchImportFileManifestEntry[] = [];
  let canceled = false;
  let truncated = false;
  let pngsDiscovered = 0;
  let lastScanProgressKey = "";

  if (!folderPath) {
    throw new BatchDiscoveryFatalError(
      "INVALID_INPUT",
      "The batch session does not contain a selected folder.",
    );
  }

  emitDiscoveryProgress({
    jobId,
    phase: "discovering",
    fileIndex: 0,
    fileTotal: 0,
    currentFileName: "",
    status: "running",
    message: "Scanning folder for PNG files",
    counts: buildProgressCounts(files),
  });

  let scanResult;

  try {
    scanResult = await scanFolderForPngFiles(
      folderPath,
      () => isBatchImportCancelRequested(jobId),
      ({ entriesScanned, pngsDiscovered: discoveredCount }) => {
        const scanProgressKey = `${entriesScanned}|${discoveredCount}`;

        if (scanProgressKey === lastScanProgressKey) {
          return;
        }

        lastScanProgressKey = scanProgressKey;

        emitDiscoveryProgress({
          jobId,
          phase: "discovering",
          fileIndex: entriesScanned,
          fileTotal: 0,
          currentFileName: "",
          status: "running",
          message: `Scanning folder (${discoveredCount} PNG${discoveredCount === 1 ? "" : "s"} found)`,
          counts: buildProgressCounts(files),
        });
      },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "The selected folder could not be scanned.";

    throw new BatchDiscoveryFatalError("FILE_NOT_FOUND", message);
  }

  if (isBatchImportCancelRequested(jobId)) {
    canceled = true;
  }

  truncated = scanResult.truncated;
  pngsDiscovered = scanResult.pngsDiscovered;
  const candidates = scanResult.candidates;
  const fileTotal = candidates.length;

  for (let index = 0; index < candidates.length; index += 1) {
    if (isBatchImportCancelRequested(jobId)) {
      canceled = true;
      break;
    }

    const candidate = candidates[index];

    try {
      const validation = await validatePngFile(candidate.absolutePath);

      registerBatchValidatedPath(jobId, candidate.absolutePath);

      files.push({
        filePath: candidate.absolutePath,
        displayName: validation.fileName,
        relativePath: candidate.relativePath,
        fileSizeBytes: validation.fileSizeBytes,
        sourceType: "folder",
        outcome: "validated",
        validation,
      });
    } catch (error) {
      files.push({
        filePath: candidate.absolutePath,
        displayName: candidate.fileName,
        relativePath: candidate.relativePath,
        fileSizeBytes: 0,
        sourceType: "folder",
        outcome: "rejected",
        rejection: mapPngValidationFailureToRejection(candidate.absolutePath, error),
      });
    }

    emitDiscoveryProgress({
      jobId,
      phase: "validating",
      fileIndex: index + 1,
      fileTotal,
      currentFileName: candidate.fileName,
      status: canceled
        ? "cancelled"
        : files.at(-1)?.outcome === "validated"
          ? "success"
          : "rejected",
      message: `Validated ${candidate.fileName}`,
      counts: buildProgressCounts(files),
    });
  }

  emitDiscoveryFinished(webContents, emitDiscoveryProgress, {
    canceled,
    fileTotal,
    files,
    jobId,
    pngsDiscovered,
    sourceType: "folder",
    truncated,
  });

  return canceled;
}
