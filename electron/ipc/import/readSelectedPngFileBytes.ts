import { readFile } from "node:fs/promises";

import type { ReadSelectedPngFileBytesResult } from "../../../shared/types/import/importIpc.types";
import { getFileName } from "./importPathUtils";
import { PngValidationError, validatePngFile } from "./pngValidator";

export async function readSelectedPngFileBytes(
  filePath: string,
): Promise<ReadSelectedPngFileBytesResult> {
  await validatePngFile(filePath);

  const fileBuffer = await readFile(filePath);

  return {
    filePath,
    fileName: getFileName(filePath),
    fileSizeBytes: fileBuffer.length,
    bytes: Uint8Array.from(fileBuffer),
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
