import { app, BrowserWindow, ipcMain } from "electron";

import { importIpcFailure, importIpcSuccess } from "../import/importIpcResponse";
import { openDetachedDevTools } from "./devToolsWindowState";
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
}
