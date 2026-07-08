import type { WebContents } from "electron";

import type { BatchImportFileManifestEntry } from "@fresh-prints/shared/types/import/batchImport.types";
import { extractZipPngCandidates } from "../../services/import/zipExtractor";
import { createJobTempDir } from "../../services/import/tempDirectoryService";
import {
  buildProgressCounts,
  createDiscoveryProgressEmitter,
  emitDiscoveryFinished,
} from "./batchDiscoveryHelpers";
import { BatchDiscoveryFatalError } from "./batchDiscoveryFatalError";
import {
  getBatchSessionZipPath,
  isBatchImportCancelRequested,
  registerBatchValidatedPath,
} from "./importBatchSession";
import { mapPngValidationFailureToRejection } from "./mapPngValidationFailureToRejection";
import { validatePngFile } from "./pngValidator";

export async function runZipBatchDiscovery(
  jobId: string,
  webContents: WebContents,
): Promise<boolean> {
  const emitDiscoveryProgress = createDiscoveryProgressEmitter(webContents);
  const zipPath = getBatchSessionZipPath(jobId);
  const files: BatchImportFileManifestEntry[] = [];
  let canceled = false;
  let truncated = false;
  let pngsDiscovered = 0;
  let lastExtractProgressKey = "";

  if (!zipPath) {
    throw new BatchDiscoveryFatalError(
      "INVALID_INPUT",
      "The batch session does not contain a selected ZIP file.",
    );
  }

  emitDiscoveryProgress({
    jobId,
    phase: "discovering",
    fileIndex: 0,
    fileTotal: 0,
    currentFileName: "",
    status: "running",
    message: "Preparing ZIP extraction",
    counts: buildProgressCounts(files),
  });

  const jobTempDir = await createJobTempDir(jobId);

  const extractResult = await extractZipPngCandidates({
    zipPath,
    extractRoot: jobTempDir,
    shouldCancel: () => isBatchImportCancelRequested(jobId),
    onProgress: ({ entriesScanned, pngsDiscovered: discoveredCount }) => {
      const extractProgressKey = `${entriesScanned}|${discoveredCount}`;

      if (extractProgressKey === lastExtractProgressKey) {
        return;
      }

      lastExtractProgressKey = extractProgressKey;

      emitDiscoveryProgress({
        jobId,
        phase: "discovering",
        fileIndex: entriesScanned,
        fileTotal: 0,
        currentFileName: "",
        status: "running",
        message: `Extracting ZIP (${discoveredCount} PNG${discoveredCount === 1 ? "" : "s"} found)`,
        counts: buildProgressCounts(files),
      });
    },
  });

  if (isBatchImportCancelRequested(jobId)) {
    canceled = true;
  }

  truncated = extractResult.truncated;
  pngsDiscovered = extractResult.pngsDiscovered;
  const candidates = extractResult.candidates;
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
        sourceType: "zip",
        outcome: "validated",
        validation,
      });
    } catch (error) {
      files.push({
        filePath: candidate.absolutePath,
        displayName: candidate.fileName,
        relativePath: candidate.relativePath,
        fileSizeBytes: 0,
        sourceType: "zip",
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
    sourceType: "zip",
    truncated,
  });

  return canceled;
}
