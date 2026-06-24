import type { FinishBatchImportJobRequest } from "../../../shared/types/import/importIpc.types";
import { deleteJobTempDir } from "../../services/import/tempDirectoryService";
import { finishBatchImportSession } from "./importBatchSession";

export async function finishBatchImportJob(
  request: FinishBatchImportJobRequest,
  webContentsId: number,
): Promise<{ jobId: string; tempDirDeleted: boolean; sessionCleared: boolean }> {
  let tempDirDeleted = false;

  try {
    tempDirDeleted = await deleteJobTempDir(request.jobId);
  } catch {
    tempDirDeleted = false;
  }

  const sessionCleared = finishBatchImportSession(request.jobId, webContentsId);

  return {
    jobId: request.jobId,
    tempDirDeleted,
    sessionCleared,
  };
}
