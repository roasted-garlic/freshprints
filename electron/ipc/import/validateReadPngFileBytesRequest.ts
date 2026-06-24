import type {
  ReadBatchValidatedPngFileBytesRequest,
  ReadSinglePngFileBytesRequest,
} from "../../../shared/types/import/readPngFileBytes.types";
import { DEFAULT_READ_PNG_FILE_BYTES_OPTIONS } from "../../../shared/types/import/readPngFileBytes.types";
import { getBatchImportSession, isBatchValidatedPath } from "./importBatchSession";
import { isRegisteredImportFilePath, isValidatedImportFilePath } from "./importFileSession";
import { isUnsafeClientFilePath } from "./importPathUtils";
import { importIpcFailure } from "./importIpcResponse";

function isReadBatchValidatedPngFileBytesRequest(
  value: unknown,
): value is ReadBatchValidatedPngFileBytesRequest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const request = value as Partial<ReadBatchValidatedPngFileBytesRequest>;

  return (
    typeof request.jobId === "string" &&
    request.jobId.trim().length > 0 &&
    typeof request.filePath === "string" &&
    request.filePath.trim().length > 0
  );
}

function isReadSinglePngFileBytesRequest(value: unknown): value is ReadSinglePngFileBytesRequest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const request = value as Partial<ReadSinglePngFileBytesRequest>;

  return (
    typeof request.filePath === "string" &&
    request.filePath.trim().length > 0 &&
    !("jobId" in request)
  );
}

function resolveIncludeDerivatives(value: boolean | undefined): boolean {
  return value === true;
}

export function validateReadPngFileBytesRequest(
  webContentsId: number,
  payload: unknown,
):
  | { mode: "single"; filePath: string; includeDerivatives: boolean }
  | { mode: "batch"; request: ReadBatchValidatedPngFileBytesRequest; includeDerivatives: boolean }
  | ReturnType<typeof importIpcFailure> {
  if (typeof payload === "string") {
    if (isUnsafeClientFilePath(payload)) {
      return importIpcFailure("INVALID_INPUT", "The provided file path is invalid.");
    }

    if (!isRegisteredImportFilePath(payload)) {
      return importIpcFailure(
        "INVALID_INPUT",
        "Use a PNG file only after selecting it with the file picker.",
      );
    }

    if (!isValidatedImportFilePath(payload)) {
      return importIpcFailure(
        "INVALID_INPUT",
        "Read PNG bytes only after the file has passed validation.",
      );
    }

    return {
      mode: "single",
      filePath: payload,
      includeDerivatives: DEFAULT_READ_PNG_FILE_BYTES_OPTIONS.includeDerivatives,
    };
  }

  if (isReadSinglePngFileBytesRequest(payload)) {
    if (isUnsafeClientFilePath(payload.filePath)) {
      return importIpcFailure("INVALID_INPUT", "The provided file path is invalid.");
    }

    if (!isRegisteredImportFilePath(payload.filePath)) {
      return importIpcFailure(
        "INVALID_INPUT",
        "Use a PNG file only after selecting it with the file picker.",
      );
    }

    if (!isValidatedImportFilePath(payload.filePath)) {
      return importIpcFailure(
        "INVALID_INPUT",
        "Read PNG bytes only after the file has passed validation.",
      );
    }

    return {
      mode: "single",
      filePath: payload.filePath,
      includeDerivatives: resolveIncludeDerivatives(payload.includeDerivatives),
    };
  }

  if (!isReadBatchValidatedPngFileBytesRequest(payload)) {
    return importIpcFailure(
      "INVALID_INPUT",
      "A validated PNG file path or batch read request is required.",
    );
  }

  if (isUnsafeClientFilePath(payload.filePath)) {
    return importIpcFailure("INVALID_INPUT", "The provided file path is invalid.");
  }

  const session = getBatchImportSession(payload.jobId);

  if (!session) {
    return importIpcFailure(
      "INVALID_INPUT",
      "No batch import session was found for the provided job ID.",
    );
  }

  if (session.webContentsId !== webContentsId) {
    return importIpcFailure(
      "INVALID_INPUT",
      "The batch import session does not belong to this window.",
    );
  }

  if (session.status !== "discovering") {
    return importIpcFailure(
      "INVALID_INPUT",
      "Batch PNG bytes can only be read while the batch session is awaiting upload.",
    );
  }

  if (!isBatchValidatedPath(payload.jobId, payload.filePath)) {
    return importIpcFailure(
      "INVALID_INPUT",
      "The requested file path was not validated for this batch import job.",
    );
  }

  return {
    mode: "batch",
    request: payload,
    includeDerivatives: resolveIncludeDerivatives(payload.includeDerivatives),
  };
}
