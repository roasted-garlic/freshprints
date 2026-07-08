import type { ImportIpcError, ImportIpcErrorCode, ImportIpcResult } from "@fresh-prints/shared/types/import/importIpc.types";

export function importIpcSuccess<T>(data: T): ImportIpcResult<T> {
  return { success: true, data };
}

export function importIpcFailure<T>(
  code: ImportIpcErrorCode,
  message: string,
): ImportIpcResult<T> {
  const error: ImportIpcError = { code, message };
  return { success: false, error };
}
