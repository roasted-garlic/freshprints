import path from "node:path";

import type { FolderBatchDiscoverySummary } from "@fresh-prints/shared/types/import/batchImport.types";
import type { FolderZipCandidate } from "./folderScanner";
import { extractZipPngCandidates, type ZipExtractedCandidate } from "./zipExtractor";

export interface FolderZipExtractionAggregate {
  candidates: ZipExtractedCandidate[];
  nestedZipsNotOpened: number;
  pngsDiscovered: number;
  truncated: boolean;
  zipsProcessed: number;
  zipsSkippedByLimit: number;
  zipsSkippedError: number;
}

function buildZipExtractDirectoryName(relativeZipPath: string): string {
  return relativeZipPath.replace(/[/\\:]/g, "__");
}

export async function extractPngsFromFolderZipCandidates(input: {
  extractRoot: string;
  maxTotalCandidates: number;
  onProgress?: (message: string) => void;
  shouldCancel: () => boolean;
  startingCandidateCount: number;
  zipCandidates: FolderZipCandidate[];
}): Promise<FolderZipExtractionAggregate> {
  const aggregate: FolderZipExtractionAggregate = {
    candidates: [],
    nestedZipsNotOpened: 0,
    pngsDiscovered: 0,
    truncated: false,
    zipsProcessed: 0,
    zipsSkippedByLimit: 0,
    zipsSkippedError: 0,
  };

  const sharedExtractedBytes = { value: 0 };

  for (const zipCandidate of input.zipCandidates) {
    if (input.shouldCancel()) {
      break;
    }

    const remainingSlots = input.maxTotalCandidates - (input.startingCandidateCount + aggregate.candidates.length);

    if (remainingSlots <= 0) {
      aggregate.zipsSkippedByLimit += 1;
      aggregate.truncated = true;
      continue;
    }

    const zipExtractRoot = path.join(
      input.extractRoot,
      "folder-zips",
      buildZipExtractDirectoryName(zipCandidate.relativePath),
    );

    try {
      input.onProgress?.(`Extracting ${zipCandidate.fileName}`);

      const extractResult = await extractZipPngCandidates({
        extractRoot: zipExtractRoot,
        maxCandidates: remainingSlots,
        pathPrefix: `${zipCandidate.relativePath}/`,
        sharedExtractedBytes,
        shouldCancel: input.shouldCancel,
        zipPath: zipCandidate.absolutePath,
      });

      aggregate.zipsProcessed += 1;
      aggregate.nestedZipsNotOpened += extractResult.nestedZipsNotOpened;
      aggregate.pngsDiscovered += extractResult.pngsDiscovered;
      aggregate.truncated = aggregate.truncated || extractResult.truncated;

      for (const candidate of extractResult.candidates) {
        if (aggregate.candidates.length >= remainingSlots) {
          aggregate.truncated = true;
          break;
        }

        aggregate.candidates.push(candidate);
      }
    } catch {
      aggregate.zipsSkippedError += 1;
    }
  }

  return aggregate;
}

export function buildInitialFolderDiscoverySummary(scanResult: {
  pngsDiscovered: number;
  zipsDiscovered: number;
  zipsSkipped: number;
}): FolderBatchDiscoverySummary {
  const zipsSkippedOther = scanResult.zipsSkipped;

  return {
    loosePngsFound: scanResult.pngsDiscovered,
    zipsFound: scanResult.zipsDiscovered,
    zipsProcessed: 0,
    zipsSkipped: zipsSkippedOther,
    zipsSkippedByLimit: 0,
    zipsSkippedOther,
    nestedZipsNotOpened: 0,
  };
}
