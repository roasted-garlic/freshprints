import type { ImportIpcResult } from "../../../shared/types/import/importIpc.types";
import { hasActiveBatchImportSession } from "./importBatchSession";
import { isSingleFileImportSessionActive } from "./importFileSession";
import { importIpcFailure } from "./importIpcResponse";

export function getSingleFileSessionBlockedError<T>(): ImportIpcResult<T> {
  return importIpcFailure(
    "SESSION_CONFLICT",
    "Finish or clear the current single PNG import before starting a batch import.",
  );
}

export function getBatchSessionBlockedError<T>(): ImportIpcResult<T> {
  return importIpcFailure(
    "SESSION_CONFLICT",
    "Finish or cancel the active batch import before using single PNG import.",
  );
}

export function assertCanStartSingleFileImport<T>(): ImportIpcResult<T> | null {
  if (hasActiveBatchImportSession()) {
    return getBatchSessionBlockedError<T>();
  }

  return null;
}

export function assertCanStartBatchImport<T>(): ImportIpcResult<T> | null {
  if (isSingleFileImportSessionActive()) {
    return getSingleFileSessionBlockedError<T>();
  }

  if (hasActiveBatchImportSession()) {
    return importIpcFailure(
      "SESSION_CONFLICT",
      "Finish or cancel the active batch import before starting another batch import.",
    );
  }

  return null;
}
