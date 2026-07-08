import { dialog } from "electron";

import { MAX_ZIP_SIZE_BYTES } from "@fresh-prints/shared/constants/import/batchImportLimits.constants";
import { ImportLimitExceededError } from "@fresh-prints/shared/errors/importLimitErrors";
import type { SelectImportZipFileResult } from "@fresh-prints/shared/types/import/importIpc.types";
import { formatZipSizeLimitExceededMessage } from "@fresh-prints/shared/utils/importLimitMessages";
import { getActiveBrowserWindow } from "./importBrowserWindow";
import { registerBatchImportSelection } from "./importBatchSession";
import { buildSelectedZipFile } from "./importZipSelection";

export async function selectImportZipFile(webContentsId: number): Promise<SelectImportZipFileResult> {
  const browserWindow = getActiveBrowserWindow();

  const dialogOptions = {
    properties: ["openFile"] as Array<"openFile">,
    title: "Select ZIP file",
    filters: [{ name: "ZIP Archives", extensions: ["zip"] }],
  };

  const dialogResult = browserWindow
    ? await dialog.showOpenDialog(browserWindow, dialogOptions)
    : await dialog.showOpenDialog(dialogOptions);

  if (dialogResult.canceled || dialogResult.filePaths.length === 0) {
    return { canceled: true };
  }

  const selectedPath = dialogResult.filePaths[0];

  if (!selectedPath) {
    return { canceled: true };
  }

  const file = await buildSelectedZipFile(selectedPath);

  if (file.fileSizeBytes > MAX_ZIP_SIZE_BYTES) {
    throw new ImportLimitExceededError(formatZipSizeLimitExceededMessage());
  }

  const session = registerBatchImportSelection({
    webContentsId,
    sourceType: "zip",
    zipFilePath: file.filePath,
  });

  return {
    canceled: false,
    jobId: session.jobId,
    sourceType: "zip",
    fileName: file.fileName,
    fileSizeBytes: file.fileSizeBytes,
  };
}
