import { contextBridge, ipcRenderer } from "electron";

import {
  WHATNOT_IMPORT_SHELL_COMPLETED_EVENT,
  WHATNOT_IMPORT_SHELL_IPC_CHANNELS,
  WHATNOT_IMPORT_SHELL_PAGE_STATUS_EVENT,
  isAllowedWhatnotImportShellIpcChannel,
} from "./whatnotImportIpcChannels";
import type {
  FreshPrintsWhatnotImportShellApi,
  WhatnotImportShellPageStatusEvent,
  ScanWhatnotShowsResult,
  WhatnotShowImportCompletedEvent,
  WhatnotShowImportShellConfirmPayload,
} from "@fresh-prints/shared/types/whatnotImport/whatnotImport.types";
import type { ImportIpcResult } from "@fresh-prints/shared/types/import/importIpc.types";

function invokeShellChannel<T>(
  channel: (typeof WHATNOT_IMPORT_SHELL_IPC_CHANNELS)[keyof typeof WHATNOT_IMPORT_SHELL_IPC_CHANNELS],
  payload?: unknown,
): Promise<ImportIpcResult<T>> {
  if (!isAllowedWhatnotImportShellIpcChannel(channel)) {
    return Promise.resolve({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "The requested operation is not allowed." },
    });
  }

  return ipcRenderer.invoke(channel, payload) as Promise<ImportIpcResult<T>>;
}

const api: FreshPrintsWhatnotImportShellApi = {
  scan(): Promise<ImportIpcResult<ScanWhatnotShowsResult>> {
    return invokeShellChannel<ScanWhatnotShowsResult>(WHATNOT_IMPORT_SHELL_IPC_CHANNELS.SCAN);
  },

  confirm(
    payload: WhatnotShowImportShellConfirmPayload,
  ): Promise<ImportIpcResult<{ acknowledged: boolean }>> {
    return invokeShellChannel<{ acknowledged: boolean }>(WHATNOT_IMPORT_SHELL_IPC_CHANNELS.CONFIRM, payload);
  },

  cancel(): Promise<ImportIpcResult<{ acknowledged: boolean }>> {
    return invokeShellChannel<{ acknowledged: boolean }>(WHATNOT_IMPORT_SHELL_IPC_CHANNELS.CANCEL);
  },

  onImportCompleted(callback: (event: WhatnotShowImportCompletedEvent) => void): () => void {
    const listener = (_ipcEvent: Electron.IpcRendererEvent, payload: WhatnotShowImportCompletedEvent) => {
      callback(payload);
    };

    ipcRenderer.on(WHATNOT_IMPORT_SHELL_COMPLETED_EVENT, listener);

    return () => {
      ipcRenderer.removeListener(WHATNOT_IMPORT_SHELL_COMPLETED_EVENT, listener);
    };
  },

  onPageStatus(callback: (event: WhatnotImportShellPageStatusEvent) => void): () => void {
    const listener = (_ipcEvent: Electron.IpcRendererEvent, payload: WhatnotImportShellPageStatusEvent) => {
      callback(payload);
    };

    ipcRenderer.on(WHATNOT_IMPORT_SHELL_PAGE_STATUS_EVENT, listener);

    return () => {
      ipcRenderer.removeListener(WHATNOT_IMPORT_SHELL_PAGE_STATUS_EVENT, listener);
    };
  },
};

contextBridge.exposeInMainWorld("freshPrintsWhatnotImportShell", api);
