import { writeFile } from "node:fs/promises";

import { dialog } from "electron";

import type {
  DownloadExportImageRequest,
  DownloadExportImageResult,
} from "@fresh-prints/shared/types/export/showExportIpc.types";

import { getActiveBrowserWindow } from "../../ipc/import/importBrowserWindow";
import { sanitizeDownloadFileName } from "../download/downloadFileName";
import { downloadAndResizeExportImage } from "./downloadAndResizeExportImage";

export async function exportSingleImage(
  request: DownloadExportImageRequest,
): Promise<DownloadExportImageResult> {
  const downloadResult = await downloadAndResizeExportImage(
    request.downloadUrl,
    request.targetWidthPx,
    request.targetHeightPx,
    request.fileName,
  );

  if (!downloadResult.success) {
    throw new Error(downloadResult.warning.message);
  }

  const browserWindow = getActiveBrowserWindow();
  const defaultFileName = sanitizeDownloadFileName(downloadResult.data.fileName);
  const saveDialogOptions = {
    title: "Save PNG",
    defaultPath: defaultFileName,
    filters: [{ name: "PNG Images", extensions: ["png"] }],
  };
  const dialogResult = browserWindow
    ? await dialog.showSaveDialog(browserWindow, saveDialogOptions)
    : await dialog.showSaveDialog(saveDialogOptions);

  if (dialogResult.canceled || !dialogResult.filePath) {
    return { canceled: true };
  }

  await writeFile(dialogResult.filePath, downloadResult.data.pngBytes);

  return {
    canceled: false,
    savedFilePath: dialogResult.filePath,
    warning: downloadResult.data.warning ?? undefined,
  };
}
