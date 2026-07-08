import { ipcMain } from "electron";

import { EXPORT_IPC_CHANNELS } from "./exportIpcChannels";
import { emitExportProgress, emitGangSheetExportProgress } from "./exportEvents";
import { validateExportGangSheetPngRequest, validateExportShowZipRequest } from "./exportRequestValidation";
import { importIpcFailure, importIpcSuccess } from "../import/importIpcResponse";
import { AllExportImagesFailedError, exportShowZip } from "../../services/export/exportShowZip";
import { AllGangSheetImagesFailedError, exportGangSheetPng } from "../../services/export/exportGangSheetPng";

export function registerExportIpcHandlers(): void {
  ipcMain.handle(EXPORT_IPC_CHANNELS.EXPORT_SHOW_ZIP, async (event, payload: unknown) => {
    const validated = validateExportShowZipRequest(payload);

    if ("error" in validated) {
      return validated.error;
    }

    try {
      const result = await exportShowZip(validated.request, (progressEvent) =>
        emitExportProgress(event.sender, progressEvent),
      );
      return importIpcSuccess(result);
    } catch (error) {
      if (error instanceof AllExportImagesFailedError) {
        return importIpcFailure("VALIDATION_FAILED", error.message);
      }

      const message = error instanceof Error ? error.message : "An unexpected error occurred during export.";
      return importIpcFailure("INTERNAL_ERROR", message);
    }
  });

  ipcMain.handle(EXPORT_IPC_CHANNELS.EXPORT_GANG_SHEET_PNG, async (event, payload: unknown) => {
    const validated = validateExportGangSheetPngRequest(payload);

    if ("error" in validated) {
      return validated.error;
    }

    try {
      const result = await exportGangSheetPng(validated.request, (progressEvent) =>
        emitGangSheetExportProgress(event.sender, progressEvent),
      );
      return importIpcSuccess(result);
    } catch (error) {
      if (error instanceof AllGangSheetImagesFailedError) {
        return importIpcFailure("VALIDATION_FAILED", error.message);
      }

      const message =
        error instanceof Error ? error.message : "An unexpected error occurred during gang sheet export.";
      return importIpcFailure("INTERNAL_ERROR", message);
    }
  });
}
