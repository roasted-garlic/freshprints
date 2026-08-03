import { ipcMain } from "electron";

import { importIpcFailure, importIpcSuccess } from "../import/importIpcResponse";
import { STUDIO_UPDATE_IPC_CHANNELS } from "./studioUpdateIpcChannels";
import {
  checkForStudioUpdate,
  downloadStudioUpdate,
  getStudioUpdateState,
  postponeStudioUpdate,
  restartAndInstallStudioUpdate,
  subscribeToStudioUpdateState,
} from "./studioUpdateService";

export function registerStudioUpdateIpcHandlers(): void {
  ipcMain.handle(STUDIO_UPDATE_IPC_CHANNELS.GET_STATE, (event) => {
    subscribeToStudioUpdateState(event.sender);
    return importIpcSuccess(getStudioUpdateState());
  });

  ipcMain.handle(STUDIO_UPDATE_IPC_CHANNELS.CHECK, async () => {
    try {
      const state = await checkForStudioUpdate();
      return importIpcSuccess({ state });
    } catch {
      return importIpcFailure("INTERNAL_ERROR", "Unable to check for a Studio update right now.");
    }
  });

  ipcMain.handle(STUDIO_UPDATE_IPC_CHANNELS.DOWNLOAD, async () => {
    try {
      const state = await downloadStudioUpdate();
      return importIpcSuccess({ state });
    } catch {
      return importIpcFailure("INTERNAL_ERROR", "Unable to download the Studio update right now.");
    }
  });

  ipcMain.handle(STUDIO_UPDATE_IPC_CHANNELS.RESTART_AND_INSTALL, () => {
    const result = restartAndInstallStudioUpdate();
    return importIpcSuccess(result);
  });

  ipcMain.handle(STUDIO_UPDATE_IPC_CHANNELS.POSTPONE, () => {
    const state = postponeStudioUpdate();
    return importIpcSuccess({ state });
  });
}
