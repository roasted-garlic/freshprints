import { importIpcFailure } from "./importIpcResponse";
import type { ImportIpcResult } from "@fresh-prints/shared/types/import/importIpc.types";

const BATCH_IMPORT_NOT_IMPLEMENTED_MESSAGE =
  "Batch import is not implemented yet. This API will be enabled in a later Phase 3B step.";

export function batchImportNotImplemented<T>(): ImportIpcResult<T> {
  return importIpcFailure("NOT_IMPLEMENTED", BATCH_IMPORT_NOT_IMPLEMENTED_MESSAGE);
}
