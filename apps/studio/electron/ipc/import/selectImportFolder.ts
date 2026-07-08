import { stat } from "node:fs/promises";
import path from "node:path";
import { dialog } from "electron";

import type { SelectImportFolderResult } from "@fresh-prints/shared/types/import/importIpc.types";
import { getActiveBrowserWindow } from "./importBrowserWindow";
import { registerBatchImportSelection } from "./importBatchSession";
import { getFileName } from "./importPathUtils";

export async function selectImportFolder(webContentsId: number): Promise<SelectImportFolderResult> {
  const browserWindow = getActiveBrowserWindow();

  const dialogOptions = {
    properties: ["openDirectory"] as Array<"openDirectory">,
    title: "Select folder to import",
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

  const normalizedPath = path.normalize(selectedPath);
  const folderStats = await stat(normalizedPath);

  if (!folderStats.isDirectory()) {
    throw new Error("The selected path is not a folder.");
  }

  const session = registerBatchImportSelection({
    webContentsId,
    sourceType: "folder",
    folderPath: normalizedPath,
  });

  return {
    canceled: false,
    jobId: session.jobId,
    sourceType: "folder",
    folderName: getFileName(normalizedPath),
  };
}
