import { dialog } from "electron";

import type { SelectSinglePngFileResult } from "../../../shared/types/import/importIpc.types";
import { getActiveBrowserWindow } from "./importBrowserWindow";
import { registerImportFilePath } from "./importFileSession";
import { buildSelectedPngFile } from "./selectedPngFileBuilder";

export async function selectSinglePngFile(): Promise<SelectSinglePngFileResult> {
  const browserWindow = getActiveBrowserWindow();

  const dialogOptions = {
    properties: ["openFile"] as Array<"openFile">,
    title: "Select PNG file",
    filters: [{ name: "PNG Images", extensions: ["png"] }],
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

  const file = await buildSelectedPngFile(selectedPath);
  registerImportFilePath(file.filePath);

  return {
    canceled: false,
    file,
  };
}
