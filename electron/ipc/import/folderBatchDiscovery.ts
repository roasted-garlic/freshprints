import type { WebContents } from "electron";

import type { BatchImportFileManifestEntry } from "../../../shared/types/import/batchImport.types";
import { MAX_BATCH_FILES } from "../../../shared/constants/import/batchImportLimits.constants";
import { scanFolderForPngFiles } from "../../services/import/folderScanner";
import {
  buildInitialFolderDiscoverySummary,
  extractPngsFromFolderZipCandidates,
} from "../../services/import/folderZipProcessor";
import { createJobTempDir } from "../../services/import/tempDirectoryService";
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

interface FolderDiscoveryCandidate {
  absolutePath: string;
  fileName: string;
  relativePath: string;
  sourceType: "folder" | "zip";
}

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
    message: "Scanning folder for PNG and ZIP files",
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
          message: `Scanning folder (${discoveredCount} loose PNG${discoveredCount === 1 ? "" : "s"} found)`,
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
  const folderDiscovery = buildInitialFolderDiscoverySummary(scanResult);

  const candidates: FolderDiscoveryCandidate[] = scanResult.candidates.map((candidate) => ({
    ...candidate,
    sourceType: "folder" as const,
  }));
  pngsDiscovered = scanResult.pngsDiscovered;

  if (!canceled && scanResult.zipCandidates.length > 0) {
    const jobTempDir = await createJobTempDir(jobId);

    emitDiscoveryProgress({
      jobId,
      phase: "discovering",
      fileIndex: 0,
      fileTotal: scanResult.zipCandidates.length,
      currentFileName: "",
      status: "running",
      message: `Extracting PNGs from ${scanResult.zipCandidates.length} ZIP archive${scanResult.zipCandidates.length === 1 ? "" : "s"}`,
      counts: buildProgressCounts(files),
    });

    const zipAggregate = await extractPngsFromFolderZipCandidates({
      extractRoot: jobTempDir,
      maxTotalCandidates: MAX_BATCH_FILES,
      onProgress: (message) => {
        emitDiscoveryProgress({
          jobId,
          phase: "discovering",
          fileIndex: folderDiscovery.zipsProcessed,
          fileTotal: scanResult.zipCandidates.length,
          currentFileName: "",
          status: "running",
          message,
          counts: buildProgressCounts(files),
        });
      },
      shouldCancel: () => isBatchImportCancelRequested(jobId),
      startingCandidateCount: candidates.length,
      zipCandidates: scanResult.zipCandidates,
    });

    if (isBatchImportCancelRequested(jobId)) {
      canceled = true;
    }

    folderDiscovery.zipsProcessed = zipAggregate.zipsProcessed;
    folderDiscovery.zipsSkippedByLimit += zipAggregate.zipsSkippedByLimit;
    folderDiscovery.zipsSkippedOther += zipAggregate.zipsSkippedError;
    folderDiscovery.zipsSkipped =
      folderDiscovery.zipsSkippedByLimit + folderDiscovery.zipsSkippedOther;
    folderDiscovery.nestedZipsNotOpened = zipAggregate.nestedZipsNotOpened;
    truncated = truncated || zipAggregate.truncated;

    for (const zipCandidate of zipAggregate.candidates) {
      if (candidates.length >= MAX_BATCH_FILES) {
        truncated = true;
        break;
      }

      candidates.push({
        absolutePath: zipCandidate.absolutePath,
        fileName: zipCandidate.fileName,
        relativePath: zipCandidate.relativePath,
        sourceType: "zip",
      });
    }

    pngsDiscovered += zipAggregate.pngsDiscovered;
  }

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
        sourceType: candidate.sourceType,
        outcome: "validated",
        validation,
      });
    } catch (error) {
      files.push({
        filePath: candidate.absolutePath,
        displayName: candidate.fileName,
        relativePath: candidate.relativePath,
        fileSizeBytes: 0,
        sourceType: candidate.sourceType,
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
    folderDiscovery,
    jobId,
    pngsDiscovered,
    sourceType: "folder",
    truncated,
  });

  return canceled;
}
