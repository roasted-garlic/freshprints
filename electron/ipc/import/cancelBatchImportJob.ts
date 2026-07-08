import type { CancelBatchImportJobRequest } from "@fresh-prints/shared/types/import/importIpc.types";
import { requestBatchImportCancel } from "./importBatchSession";

export function cancelBatchImportJob(
  request: CancelBatchImportJobRequest,
  webContentsId: number,
): { jobId: string; canceled: boolean } {
  const canceled = requestBatchImportCancel(request.jobId, webContentsId);

  return {
    jobId: request.jobId,
    canceled,
  };
}
