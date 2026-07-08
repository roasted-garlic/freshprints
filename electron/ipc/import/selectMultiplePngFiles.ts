import { dialog } from "electron";

import { MAX_BATCH_FILES } from "@fresh-prints/shared/constants/import/batchImportLimits.constants";
import type { SelectMultiplePngFilesResult } from "@fresh-prints/shared/types/import/importIpc.types";
import { getActiveBrowserWindow } from "./importBrowserWindow";
import { registerBatchImportSelection } from "./importBatchSession";
import { buildSelectedPngFile } from "./selectedPngFileBuilder";

export async function selectMultiplePngFiles(
  webContentsId: number,
): Promise<SelectMultiplePngFilesResult> {
  const browserWindow = getActiveBrowserWindow();

  const dialogOptions = {
    properties: ["openFile", "multiSelections"] as Array<"openFile" | "multiSelections">,
    title: "Select PNG files",
    filters: [{ name: "PNG Images", extensions: ["png"] }],
  };

  const dialogResult = browserWindow
    ? await dialog.showOpenDialog(browserWindow, dialogOptions)
    : await dialog.showOpenDialog(dialogOptions);

  if (dialogResult.canceled || dialogResult.filePaths.length === 0) {
    return { canceled: true };
  }

  if (dialogResult.filePaths.length > MAX_BATCH_FILES) {
    throw new Error(
      `You can select up to ${MAX_BATCH_FILES} PNG files per batch. Reduce your selection and try again.`,
    );
  }

  const files = await Promise.all(
    dialogResult.filePaths.map(async (selectedPath) => {
      if (!selectedPath) {
        throw new Error("A selected file path was missing.");
      }

      return buildSelectedPngFile(selectedPath);
    }),
  );

  const session = registerBatchImportSelection({
    webContentsId,
    sourceType: "multiple-png",
    filePaths: files.map((file) => file.filePath),
  });

  return {
    canceled: false,
    jobId: session.jobId,
    sourceType: "multiple-png",
    fileCount: files.length,
    fileNames: files.map((file) => file.fileName),
  };
}
