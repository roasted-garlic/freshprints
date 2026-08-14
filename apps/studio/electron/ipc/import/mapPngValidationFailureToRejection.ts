import type { ImportFileRejection } from "@fresh-prints/shared/types/import/batchImport.types";
import { PngValidationError } from "./pngValidator";
import { getFileName } from "./importPathUtils";

export function mapPngValidationFailureToRejection(
  filePath: string,
  error: unknown,
): ImportFileRejection {
  const fileName = getFileName(filePath);

  if (error instanceof PngValidationError) {
    if (error.reasonCode) {
      return {
        reasonCode: error.reasonCode,
        message: error.message,
      };
    }

    if (error.message.includes("maximum allowed size")) {
      return {
        reasonCode: "FILE_TOO_LARGE",
        message: error.message,
      };
    }

    if (error.message.startsWith("Image cannot achieve")) {
      return {
        reasonCode: "PRINT_SIZE_INSUFFICIENT",
        message: error.message,
      };
    }

    return {
      reasonCode: "INVALID_PNG",
      message: error.message,
    };
  }

  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  ) {
    return {
      reasonCode: "FILE_NOT_FOUND",
      message: `The file "${fileName}" could not be found.`,
    };
  }

  const message =
    error instanceof Error
      ? error.message
      : `Validation failed for "${fileName}".`;

  return {
    reasonCode: "VALIDATION_ERROR",
    message,
  };
}
