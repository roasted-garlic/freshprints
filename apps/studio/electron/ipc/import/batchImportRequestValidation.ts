import type {
  CancelBatchImportJobRequest,
  FinishBatchImportJobRequest,
  StartBatchDiscoveryRequest,
} from "@fresh-prints/shared/types/import/importIpc.types";
import type { BatchImportSourceType } from "@fresh-prints/shared/types/import/batchImport.types";
import { importIpcFailure } from "./importIpcResponse";

const BATCH_SOURCE_TYPES = new Set<BatchImportSourceType>(["multiple-png", "folder", "zip"]);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateStartBatchDiscoveryRequest(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return {
      error: importIpcFailure("INVALID_INPUT", "A batch discovery request object is required."),
    };
  }

  const request = payload as Partial<StartBatchDiscoveryRequest>;

  if (!isNonEmptyString(request.jobId)) {
    return {
      error: importIpcFailure("INVALID_INPUT", "A batch job ID is required."),
    };
  }

  if (!request.sourceType || !BATCH_SOURCE_TYPES.has(request.sourceType)) {
    return {
      error: importIpcFailure("INVALID_INPUT", "A valid batch source type is required."),
    };
  }

  return {
    request: request as StartBatchDiscoveryRequest,
  };
}

export function validateCancelBatchImportJobRequest(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return {
      error: importIpcFailure("INVALID_INPUT", "A cancel batch job request object is required."),
    };
  }

  const request = payload as Partial<CancelBatchImportJobRequest>;

  if (!isNonEmptyString(request.jobId)) {
    return {
      error: importIpcFailure("INVALID_INPUT", "A batch job ID is required."),
    };
  }

  return {
    request: request as CancelBatchImportJobRequest,
  };
}

export function validateFinishBatchImportJobRequest(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return {
      error: importIpcFailure("INVALID_INPUT", "A finish batch job request object is required."),
    };
  }

  const request = payload as Partial<FinishBatchImportJobRequest>;

  if (!isNonEmptyString(request.jobId)) {
    return {
      error: importIpcFailure("INVALID_INPUT", "A batch job ID is required."),
    };
  }

  return {
    request: request as FinishBatchImportJobRequest,
  };
}
