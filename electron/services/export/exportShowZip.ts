import { writeFile } from "node:fs/promises";
import { dialog } from "electron";

import { buildExportZipBuffer } from "./buildExportZipBuffer";
import { downloadAndResizeExportImage } from "./downloadAndResizeExportImage";
import { getActiveBrowserWindow } from "../../ipc/import/importBrowserWindow";
import { withMultiplyByQuantitySuffix } from "@fresh-prints/shared/utils/showExportFilename";
import type {
  ExportShowZipRequest,
  ExportShowZipResult,
  ShowExportImageWarning,
  ShowExportProgressEvent,
} from "@fresh-prints/shared/types/export/showExportIpc.types";

export type ExportProgressCallback = (event: ShowExportProgressEvent) => void;

function formatWarningsFileContent(warnings: ShowExportImageWarning[]): string {
  const lines = warnings.map((warning) => `${warning.fileName} [${warning.reason}]: ${warning.message}`);
  return `Export warnings\n================\n\n${lines.join("\n")}\n`;
}

export class AllExportImagesFailedError extends Error {
  constructor() {
    super("Every image in this export failed to download or resize. No zip was created.");
    this.name = "AllExportImagesFailedError";
  }
}

/**
 * Downloads and resizes every requested image (skipping and warning on individual failures
 * rather than aborting), builds the zip in memory, shows a native save dialog defaulting to the
 * computed filename, and writes the zip to the chosen path. Renderer never touches the
 * filesystem — this whole pipeline runs in Electron main.
 */
export async function exportShowZip(
  request: ExportShowZipRequest,
  onProgress: ExportProgressCallback = () => undefined,
): Promise<ExportShowZipResult> {
  const warnings: ShowExportImageWarning[] = [];
  const zipEntries: { fileName: string; pngBytes: Buffer }[] = [];
  const imageTotal = request.multiplyByQuantity
    ? request.images.reduce((sum, image) => sum + image.quantity, 0)
    : request.images.length;

  let imageIndex = 0;

  for (const image of request.images) {
    const copyCount = request.multiplyByQuantity ? image.quantity : 1;

    const downloadResult = await downloadAndResizeExportImage(
      image.downloadUrl,
      image.targetWidthPx,
      image.targetHeightPx,
      image.fileName,
      (step) => onProgress({ fileName: image.fileName, imageIndex: imageIndex + 1, imageTotal, step }),
    );

    for (let copyNumber = 1; copyNumber <= copyCount; copyNumber += 1) {
      imageIndex += 1;

      if (!downloadResult.success) {
        if (copyNumber === 1) {
          warnings.push(downloadResult.warning);
        }
        continue;
      }

      const fileName =
        request.multiplyByQuantity && copyCount > 1
          ? withMultiplyByQuantitySuffix(downloadResult.data.fileName, copyNumber, copyCount)
          : downloadResult.data.fileName;

      onProgress({ fileName, imageIndex, imageTotal, step: "adding_to_zip" });
      zipEntries.push({ fileName, pngBytes: downloadResult.data.pngBytes });

      if (copyNumber === 1 && downloadResult.data.warning) {
        warnings.push(downloadResult.data.warning);
      }
    }
  }

  if (zipEntries.length === 0) {
    throw new AllExportImagesFailedError();
  }

  const warningsFileContent = warnings.length > 0 ? formatWarningsFileContent(warnings) : null;
  const zipBuffer = await buildExportZipBuffer(zipEntries, warningsFileContent);

  const browserWindow = getActiveBrowserWindow();
  const saveDialogOptions = {
    title: "Save export zip",
    defaultPath: request.zipFileName,
    filters: [{ name: "ZIP Archives", extensions: ["zip"] }],
  };

  const dialogResult = browserWindow
    ? await dialog.showSaveDialog(browserWindow, saveDialogOptions)
    : await dialog.showSaveDialog(saveDialogOptions);

  if (dialogResult.canceled || !dialogResult.filePath) {
    return {
      canceled: true,
      exportedImageCount: 0,
      skippedImageCount: warnings.filter((warning) => warning.reason !== "upscaled").length,
      warnings,
    };
  }

  await writeFile(dialogResult.filePath, zipBuffer);

  return {
    canceled: false,
    savedFilePath: dialogResult.filePath,
    exportedImageCount: zipEntries.length,
    skippedImageCount: warnings.filter((warning) => warning.reason !== "upscaled").length,
    warnings,
  };
}
