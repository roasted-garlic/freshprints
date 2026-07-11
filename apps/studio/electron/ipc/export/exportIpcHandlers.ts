import { ipcMain } from "electron";

import { EXPORT_IPC_CHANNELS } from "./exportIpcChannels";
import { emitExportProgress, emitGangSheetExportProgress } from "./exportEvents";
import {
  validateClearGangSheetCacheRequest,
  validateDownloadCachedGangSheetRequest,
  validateExportCachedGangSheetsRequest,
  validateExportShowZipRequest,
  validateGenerateGangSheetPngRequest,
  validateGetGangSheetCacheStatusRequest,
} from "./exportRequestValidation";
import { importIpcFailure, importIpcSuccess } from "../import/importIpcResponse";
import { AllExportImagesFailedError, exportShowZip } from "../../services/export/exportShowZip";
import {
  AllGangSheetImagesFailedError,
  clearAllGangSheetCache,
  clearGangSheetCache,
  downloadCachedGangSheet,
  exportCachedGangSheets,
  generateGangSheetPng,
  readGangSheetCacheStatus,
} from "../../services/export/exportGangSheetPng";

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

  ipcMain.handle(EXPORT_IPC_CHANNELS.GENERATE_GANG_SHEET_PNG, async (event, payload: unknown) => {
    const validated = validateGenerateGangSheetPngRequest(payload);

    if ("error" in validated) {
      return validated.error;
    }

    try {
      const result = await generateGangSheetPng(validated.request, (progressEvent) =>
        emitGangSheetExportProgress(event.sender, progressEvent),
      );
      return importIpcSuccess(result);
    } catch (error) {
      if (error instanceof AllGangSheetImagesFailedError) {
        return importIpcFailure("VALIDATION_FAILED", error.message);
      }

      const message =
        error instanceof Error ? error.message : "An unexpected error occurred during gang sheet generation.";
      return importIpcFailure("INTERNAL_ERROR", message);
    }
  });

  ipcMain.handle(EXPORT_IPC_CHANNELS.EXPORT_CACHED_GANG_SHEETS, async (_event, payload: unknown) => {
    const validated = validateExportCachedGangSheetsRequest(payload);

    if ("error" in validated) {
      return validated.error;
    }

    try {
      const result = await exportCachedGangSheets(validated.request);
      return importIpcSuccess(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unexpected error occurred while exporting cached gang sheets.";
      return importIpcFailure("INTERNAL_ERROR", message);
    }
  });

  ipcMain.handle(EXPORT_IPC_CHANNELS.DOWNLOAD_CACHED_GANG_SHEET, async (_event, payload: unknown) => {
    const validated = validateDownloadCachedGangSheetRequest(payload);

    if ("error" in validated) {
      return validated.error;
    }

    try {
      const result = await downloadCachedGangSheet(validated.request);
      return importIpcSuccess(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unexpected error occurred while downloading a gang sheet.";
      return importIpcFailure("INTERNAL_ERROR", message);
    }
  });

  ipcMain.handle(EXPORT_IPC_CHANNELS.CLEAR_GANG_SHEET_CACHE, async (_event, payload: unknown) => {
    const validated = validateClearGangSheetCacheRequest(payload);

    if ("error" in validated) {
      return validated.error;
    }

    try {
      await clearGangSheetCache(validated.request);
      return importIpcSuccess({ cleared: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unexpected error occurred while clearing the gang sheet cache.";
      return importIpcFailure("INTERNAL_ERROR", message);
    }
  });

  ipcMain.handle(EXPORT_IPC_CHANNELS.CLEAR_ALL_GANG_SHEET_CACHE, async () => {
    try {
      await clearAllGangSheetCache();
      return importIpcSuccess({ cleared: true });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while clearing all gang sheet caches.";
      return importIpcFailure("INTERNAL_ERROR", message);
    }
  });

  ipcMain.handle(EXPORT_IPC_CHANNELS.GET_GANG_SHEET_CACHE_STATUS, async (_event, payload: unknown) => {
    const validated = validateGetGangSheetCacheStatusRequest(payload);

    if ("error" in validated) {
      return validated.error;
    }

    try {
      const result = await readGangSheetCacheStatus(validated.request);
      return importIpcSuccess(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unexpected error occurred while reading the gang sheet cache.";
      return importIpcFailure("INTERNAL_ERROR", message);
    }
  });
}
