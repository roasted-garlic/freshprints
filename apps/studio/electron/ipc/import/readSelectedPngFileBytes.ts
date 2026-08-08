import { readFile } from "node:fs/promises";

import type { ReadSelectedPngFileBytesResult } from "@fresh-prints/shared/types/import/importIpc.types";
import { trimImportImageIfNeeded } from "../../services/import/trimImportImage";
import { upscaleImportImageIfNeeded } from "../../services/import/upscaleImportImage";
import {
  ImportOutputNormalizationError,
  normalizeImportOutputBytes,
} from "../../services/import/normalizeImportOutputBytes";
import { getFileName } from "./importPathUtils";
import { PngValidationError, validatePngFile } from "./pngValidator";
import { consumeCorrectedImportBytes } from "./correctedImportBytesCache";

/**
 * Owner QA Amendment 3, Failure 2: the processed output is normalized to fit under the upload
 * ceiling (lossless recompression first, then a bounded minimal proportional downscale) instead of
 * being rejected. Final pixel dimensions are returned only when normalization actually changed
 * them, so the renderer recalculates stored print size from the real persisted pixels.
 */
async function buildNormalizedResult(
  filePath: string,
  bytes: Buffer,
  width: number,
  height: number,
): Promise<ReadSelectedPngFileBytesResult> {
  const normalized = await normalizeImportOutputBytes(bytes, width, height);
  const pixelsChanged = normalized.width !== width || normalized.height !== height;

  return {
    filePath,
    fileName: getFileName(filePath),
    fileSizeBytes: normalized.bytes.length,
    bytes: Uint8Array.from(normalized.bytes),
    ...(pixelsChanged
      ? { normalizedWidth: normalized.width, normalizedHeight: normalized.height }
      : {}),
  };
}

export async function readSelectedPngFileBytes(
  filePath: string,
): Promise<ReadSelectedPngFileBytesResult> {
  const cached = consumeCorrectedImportBytes(filePath);

  if (cached) {
    // VALIDATE_SELECTED_PNG already ran validatePngFile (and the trim/upscale pass that produced
    // this cached result) for this exact path — re-running it here was a fully redundant second
    // full-file re-stat/re-read/re-trim pass, doubling the cost of the single most expensive step
    // in the import pipeline for a large file (post-launch-catalog-and-processing-stability,
    // Owner QA Amendment 1, Workstream 3). Skipping it here does not weaken validation: the file
    // was already validated once, synchronously, before this cache entry could exist.
    return buildNormalizedResult(filePath, cached.bytes, cached.width, cached.height);
  }

  // Cache miss (e.g. a retry after the cached correction was already consumed once, or the
  // renderer re-invoked this channel directly) — fall back to a fresh, fully validated read.
  await validatePngFile(filePath);

  const fileBuffer = await readFile(filePath);
  const trimResult = await trimImportImageIfNeeded(fileBuffer);
  const upscaleResult = await upscaleImportImageIfNeeded(
    trimResult.bytes,
    trimResult.width,
    trimResult.height,
  );

  return buildNormalizedResult(
    filePath,
    upscaleResult.bytes,
    upscaleResult.width,
    upscaleResult.height,
  );
}

export function mapReadBytesError(error: unknown) {
  if (error instanceof ImportOutputNormalizationError) {
    return { code: "FILE_TOO_LARGE" as const, message: error.message };
  }

  if (error instanceof PngValidationError) {
    if (error.message.includes("maximum allowed size")) {
      return { code: "FILE_TOO_LARGE" as const, message: error.message };
    }

    return { code: "VALIDATION_FAILED" as const, message: error.message };
  }

  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  ) {
    return {
      code: "FILE_NOT_FOUND" as const,
      message: "The selected file could not be found.",
    };
  }

  return {
    code: "INTERNAL_ERROR" as const,
    message: "An unexpected error occurred while reading the PNG file.",
  };
}
