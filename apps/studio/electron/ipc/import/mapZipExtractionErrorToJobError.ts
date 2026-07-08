import type { BatchJobErrorEvent } from "@fresh-prints/shared/types/import/batchImport.types";
import { ZipExtractionError } from "../../services/import/zipExtractionErrors";

export function mapZipExtractionErrorToJobError(
  jobId: string,
  error: unknown,
): BatchJobErrorEvent {
  if (error instanceof ZipExtractionError) {
    return {
      jobId,
      code: error.code,
      message: error.message,
    };
  }

  return {
    jobId,
    code: "ZIP_CORRUPT",
    message:
      error instanceof Error
        ? error.message
        : "The ZIP archive could not be extracted.",
  };
}
