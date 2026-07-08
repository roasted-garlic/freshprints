import { readFile } from "node:fs/promises";

import type { ReadSelectedPngFileBytesResult } from "@fresh-prints/shared/types/import/importIpc.types";
import { trimImportImageIfNeeded } from "../../services/import/trimImportImage";
import { upscaleImportImageIfNeeded } from "../../services/import/upscaleImportImage";
import { getFileName } from "./importPathUtils";
import { PngValidationError, validatePngFile } from "./pngValidator";
import { consumeCorrectedImportBytes } from "./correctedImportBytesCache";

export async function readSelectedPngFileBytes(
  filePath: string,
): Promise<ReadSelectedPngFileBytesResult> {
  await validatePngFile(filePath);

  const cached = consumeCorrectedImportBytes(filePath);

  if (cached) {
    return {
      filePath,
      fileName: getFileName(filePath),
      fileSizeBytes: cached.bytes.length,
      bytes: Uint8Array.from(cached.bytes),
    };
  }

  const fileBuffer = await readFile(filePath);
  const trimResult = await trimImportImageIfNeeded(fileBuffer);
  const upscaleResult = await upscaleImportImageIfNeeded(
    trimResult.bytes,
    trimResult.width,
    trimResult.height,
  );

  return {
    filePath,
    fileName: getFileName(filePath),
    fileSizeBytes: upscaleResult.bytes.length,
    bytes: Uint8Array.from(upscaleResult.bytes),
  };
}

export function mapReadBytesError(error: unknown) {
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
