import { app, BrowserWindow, ipcMain } from "electron";

import { importIpcFailure, importIpcSuccess } from "../import/importIpcResponse";
import { openDetachedDevTools } from "./devToolsWindowState";
import { openExternalLinkOnSameDisplay } from "./externalLinkWindow";
import {
  applyStudioWindowMinimumSize,
  readWindowMetrics,
  resetStudioWindowMinimumSizeToDefault,
  setStudioWindowMinimumSize,
  unlockStudioWindowMinimumSize,
} from "./windowMetrics";
import { APP_IPC_CHANNELS } from "./appIpcChannels";
import { confirmClose, setUploadActive } from "./uploadActivityState";

function canOpenDevTools(): boolean {
  return !app.isPackaged;
}

export function registerAppIpcHandlers(): void {
  ipcMain.handle(APP_IPC_CHANNELS.OPEN_DEV_TOOLS, async (event) => {
    try {
      if (!canOpenDevTools()) {
        return importIpcFailure(
          "INTERNAL_ERROR",
          "DevTools are only available in development builds.",
        );
      }

      const browserWindow = BrowserWindow.fromWebContents(event.sender);

      if (!browserWindow) {
        return importIpcFailure("INTERNAL_ERROR", "The application window could not be found.");
      }

      openDetachedDevTools(browserWindow);

      return importIpcSuccess({ opened: true });
    } catch {
      return importIpcFailure("INTERNAL_ERROR", "An unexpected error occurred while opening DevTools.");
    }
  });

  ipcMain.handle(APP_IPC_CHANNELS.SET_UPLOAD_ACTIVE, (_event, active: unknown) => {
    setUploadActive(active === true);
    return importIpcSuccess({ acknowledged: true });
  });

  ipcMain.handle(APP_IPC_CHANNELS.CONFIRM_CLOSE, (event) => {
    confirmClose();

    const browserWindow = BrowserWindow.fromWebContents(event.sender);
    browserWindow?.close();

    return importIpcSuccess({ acknowledged: true });
  });

  ipcMain.handle(APP_IPC_CHANNELS.OPEN_EXTERNAL_LINK, (event, url: unknown) => {
    if (typeof url !== "string") {
      return importIpcFailure("INVALID_INPUT", "A URL is required to open an external link.");
    }

    const ownerWindow = BrowserWindow.fromWebContents(event.sender);
    const opened = openExternalLinkOnSameDisplay(url, ownerWindow);

    if (!opened) {
      return importIpcFailure("INVALID_INPUT", "Only http and https links can be opened.");
    }

    return importIpcSuccess({ opened: true });
  });

  ipcMain.handle(APP_IPC_CHANNELS.GET_WINDOW_METRICS, (event) => {
    const browserWindow = BrowserWindow.fromWebContents(event.sender);

    if (!browserWindow) {
      return importIpcFailure("INTERNAL_ERROR", "The application window could not be found.");
    }

    return importIpcSuccess(readWindowMetrics(browserWindow));
  });

  ipcMain.handle(APP_IPC_CHANNELS.SET_MINIMUM_WINDOW_SIZE, (event, size: unknown) => {
    if (!canOpenDevTools()) {
      return importIpcFailure(
        "INTERNAL_ERROR",
        "Minimum window size can only be changed in development builds.",
      );
    }

    if (
      !size ||
      typeof size !== "object" ||
      typeof (size as { width?: unknown }).width !== "number" ||
      typeof (size as { height?: unknown }).height !== "number"
    ) {
      return importIpcFailure("INVALID_INPUT", "Width and height are required.");
    }

    const browserWindow = BrowserWindow.fromWebContents(event.sender);

    if (!browserWindow) {
      return importIpcFailure("INTERNAL_ERROR", "The application window could not be found.");
    }

    try {
      const nextMinimum = setStudioWindowMinimumSize(
        (size as { width: number }).width,
        (size as { height: number }).height,
      );
      applyStudioWindowMinimumSize(browserWindow);
      return importIpcSuccess(nextMinimum);
    } catch (error) {
      return importIpcFailure(
        "INVALID_INPUT",
        error instanceof Error ? error.message : "Minimum window size is invalid.",
      );
    }
  });

  ipcMain.handle(APP_IPC_CHANNELS.RESET_MINIMUM_WINDOW_SIZE, (event, request: unknown) => {
    if (!canOpenDevTools()) {
      return importIpcFailure(
        "INTERNAL_ERROR",
        "Minimum window size can only be changed in development builds.",
      );
    }

    const browserWindow = BrowserWindow.fromWebContents(event.sender);

    if (!browserWindow) {
      return importIpcFailure("INTERNAL_ERROR", "The application window could not be found.");
    }

    const mode =
      request &&
      typeof request === "object" &&
      (request as { mode?: unknown }).mode === "default"
        ? "default"
        : "unlock";

    const nextMinimum =
      mode === "default"
        ? resetStudioWindowMinimumSizeToDefault()
        : unlockStudioWindowMinimumSize();

    applyStudioWindowMinimumSize(browserWindow);
    return importIpcSuccess(nextMinimum);
  });
}
