import { contextBridge, ipcRenderer } from "electron";

import {
  APP_CONFIRM_CLOSE_REQUESTED,
  APP_IPC_CHANNELS,
  isAllowedAppIpcChannel,
} from "./ipc/app/appIpcChannels";
import {
  EXPORT_IPC_CHANNELS,
  EXPORT_IPC_EVENT_CHANNELS,
  isAllowedExportIpcChannel,
  isAllowedExportIpcEventChannel,
} from "./ipc/export/exportIpcChannels";
import {
  DEV_IMPORT_IPC_CHANNELS,
  IMPORT_IPC_CHANNELS,
  IMPORT_IPC_EVENT_CHANNELS,
  isAllowedDevImportIpcChannel,
  isAllowedImportIpcChannel,
  isAllowedImportIpcEventChannel,
} from "./ipc/import/importIpcChannels";
import {
  WHATNOT_IMPORT_CONFIRMED_EVENT,
  WHATNOT_IMPORT_IPC_CHANNELS,
  isAllowedWhatnotImportIpcChannel,
} from "./ipc/whatnotImport/whatnotImportIpcChannels";
import type {
  ConfirmCloseResult,
  OpenDevToolsResult,
  OpenExternalLinkResult,
  SetUploadActiveResult,
} from "@fresh-prints/shared/types/app/appIpc.types";
import type {
  BatchDiscoveryCompleteEvent,
  BatchJobErrorEvent,
  BatchImportProgressEvent,
} from "@fresh-prints/shared/types/import/batchImport.types";
import type { ReadSelectedPngFileBytesRequest } from "@fresh-prints/shared/types/import/readPngFileBytes.types";
import type {
  CancelBatchImportJobRequest,
  CancelBatchImportJobResult,
  ClearSinglePngImportResult,
  FinishBatchImportJobRequest,
  FinishBatchImportJobResult,
  ImportIpcResult,
  ReadSelectedPngFileBytesResult,
  SelectImportFolderResult,
  SelectImportZipFileResult,
  SelectMultiplePngFilesResult,
  SelectSinglePngFileResult,
  SelectedPngPreviewRequest,
  SelectedPngPreviewResult,
  StartBatchDiscoveryRequest,
  StartBatchDiscoveryResult,
  ValidateSelectedPngFileResult,
} from "@fresh-prints/shared/types/import/importIpc.types";
import type { DerivativeGenerationVerificationResult } from "@fresh-prints/shared/types/import/derivativeGeneration.types";
import type {
  OpenWhatnotImportWindowResult,
  WhatnotExistingShowSummary,
  WhatnotShowImportCompletedEvent,
  WhatnotShowImportConfirmedEvent,
} from "@fresh-prints/shared/types/whatnotImport/whatnotImport.types";
import type {
  ExportShowZipRequest,
  ExportShowZipResult,
  ShowExportProgressEvent,
} from "@fresh-prints/shared/types/export/showExportIpc.types";
import type {
  ExportGangSheetPngRequest,
  ExportGangSheetPngResult,
  GangSheetExportProgressEvent,
} from "@fresh-prints/shared/types/export/gangSheetExportIpc.types";

function invokeAppChannel<T>(
  channel: (typeof APP_IPC_CHANNELS)[keyof typeof APP_IPC_CHANNELS],
  payload?: unknown,
): Promise<ImportIpcResult<T>> {
  if (!isAllowedAppIpcChannel(channel)) {
    return Promise.resolve({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "The requested app operation is not allowed.",
      },
    });
  }

  return ipcRenderer.invoke(channel, payload) as Promise<ImportIpcResult<T>>;
}

function invokeImportChannel<T>(
  channel: (typeof IMPORT_IPC_CHANNELS)[keyof typeof IMPORT_IPC_CHANNELS],
  payload?: unknown,
): Promise<ImportIpcResult<T>> {
  if (!isAllowedImportIpcChannel(channel)) {
    return Promise.resolve({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "The requested import operation is not allowed.",
      },
    });
  }

  return ipcRenderer.invoke(channel, payload) as Promise<ImportIpcResult<T>>;
}

function invokeDevImportChannel<T>(
  channel: (typeof DEV_IMPORT_IPC_CHANNELS)[keyof typeof DEV_IMPORT_IPC_CHANNELS],
): Promise<ImportIpcResult<T>> {
  if (!isAllowedDevImportIpcChannel(channel)) {
    return Promise.resolve({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "The requested dev import operation is not allowed.",
      },
    });
  }

  return ipcRenderer.invoke(channel) as Promise<ImportIpcResult<T>>;
}

function invokeWhatnotImportChannel<T>(
  channel: (typeof WHATNOT_IMPORT_IPC_CHANNELS)[keyof typeof WHATNOT_IMPORT_IPC_CHANNELS],
  payload?: unknown,
): Promise<ImportIpcResult<T>> {
  if (!isAllowedWhatnotImportIpcChannel(channel)) {
    return Promise.resolve({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "The requested Whatnot import operation is not allowed.",
      },
    });
  }

  return ipcRenderer.invoke(channel, payload) as Promise<ImportIpcResult<T>>;
}

function invokeExportChannel<T>(
  channel: (typeof EXPORT_IPC_CHANNELS)[keyof typeof EXPORT_IPC_CHANNELS],
  payload?: unknown,
): Promise<ImportIpcResult<T>> {
  if (!isAllowedExportIpcChannel(channel)) {
    return Promise.resolve({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "The requested export operation is not allowed.",
      },
    });
  }

  return ipcRenderer.invoke(channel, payload) as Promise<ImportIpcResult<T>>;
}

function subscribeExportEvent<T>(
  channel: (typeof EXPORT_IPC_EVENT_CHANNELS)[keyof typeof EXPORT_IPC_EVENT_CHANNELS],
  callback: (event: T) => void,
): () => void {
  if (!isAllowedExportIpcEventChannel(channel)) {
    return () => undefined;
  }

  const listener = (_ipcEvent: Electron.IpcRendererEvent, payload: T) => {
    callback(payload);
  };

  ipcRenderer.on(channel, listener);

  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
}

function subscribeImportEvent<T>(
  channel: (typeof IMPORT_IPC_EVENT_CHANNELS)[keyof typeof IMPORT_IPC_EVENT_CHANNELS],
  callback: (event: T) => void,
): () => void {
  if (!isAllowedImportIpcEventChannel(channel)) {
    return () => undefined;
  }

  const listener = (_ipcEvent: Electron.IpcRendererEvent, payload: T) => {
    callback(payload);
  };

  ipcRenderer.on(channel, listener);

  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
}

contextBridge.exposeInMainWorld("freshPrints", {
  app: {
    openDevTools(): Promise<ImportIpcResult<OpenDevToolsResult>> {
      return invokeAppChannel<OpenDevToolsResult>(APP_IPC_CHANNELS.OPEN_DEV_TOOLS);
    },

    setUploadActive(active: boolean): Promise<ImportIpcResult<SetUploadActiveResult>> {
      return invokeAppChannel<SetUploadActiveResult>(APP_IPC_CHANNELS.SET_UPLOAD_ACTIVE, active);
    },

    confirmClose(): Promise<ImportIpcResult<ConfirmCloseResult>> {
      return invokeAppChannel<ConfirmCloseResult>(APP_IPC_CHANNELS.CONFIRM_CLOSE);
    },

    onConfirmCloseRequested(callback: () => void): () => void {
      const listener = () => callback();
      ipcRenderer.on(APP_CONFIRM_CLOSE_REQUESTED, listener);

      return () => {
        ipcRenderer.removeListener(APP_CONFIRM_CLOSE_REQUESTED, listener);
      };
    },

    openExternalLink(url: string): Promise<ImportIpcResult<OpenExternalLinkResult>> {
      return invokeAppChannel<OpenExternalLinkResult>(APP_IPC_CHANNELS.OPEN_EXTERNAL_LINK, url);
    },
  },

  whatnotImport: {
    openImportWindow(
      baseUrl: string,
      existingShows: WhatnotExistingShowSummary[],
    ): Promise<ImportIpcResult<OpenWhatnotImportWindowResult>> {
      return invokeWhatnotImportChannel<OpenWhatnotImportWindowResult>(
        WHATNOT_IMPORT_IPC_CHANNELS.OPEN_WINDOW,
        { baseUrl, existingShows },
      );
    },

    closeImportWindow(): Promise<ImportIpcResult<{ closed: boolean }>> {
      return invokeWhatnotImportChannel<{ closed: boolean }>(WHATNOT_IMPORT_IPC_CHANNELS.CLOSE_WINDOW);
    },

    onImportConfirmed(callback: (event: WhatnotShowImportConfirmedEvent) => void): () => void {
      const listener = (_ipcEvent: Electron.IpcRendererEvent, payload: WhatnotShowImportConfirmedEvent) => {
        callback(payload);
      };

      ipcRenderer.on(WHATNOT_IMPORT_CONFIRMED_EVENT, listener);

      return () => {
        ipcRenderer.removeListener(WHATNOT_IMPORT_CONFIRMED_EVENT, listener);
      };
    },

    reportImportCompleted(
      event: WhatnotShowImportCompletedEvent,
    ): Promise<ImportIpcResult<{ acknowledged: boolean }>> {
      return invokeWhatnotImportChannel<{ acknowledged: boolean }>(
        WHATNOT_IMPORT_IPC_CHANNELS.REPORT_COMPLETED,
        event,
      );
    },
  },

  imports: {
    selectSinglePngFile(): Promise<ImportIpcResult<SelectSinglePngFileResult>> {
      return invokeImportChannel<SelectSinglePngFileResult>(IMPORT_IPC_CHANNELS.SELECT_SINGLE_PNG);
    },

    validateSelectedPngFile(
      filePath: string,
    ): Promise<ImportIpcResult<ValidateSelectedPngFileResult>> {
      return invokeImportChannel<ValidateSelectedPngFileResult>(
        IMPORT_IPC_CHANNELS.VALIDATE_SELECTED_PNG,
        filePath,
      );
    },

    clearSinglePngImport(): Promise<ImportIpcResult<ClearSinglePngImportResult>> {
      return invokeImportChannel<ClearSinglePngImportResult>(
        IMPORT_IPC_CHANNELS.CLEAR_SINGLE_PNG_IMPORT,
      );
    },

    readSelectedPngFileBytes(
      request: ReadSelectedPngFileBytesRequest,
    ): Promise<ImportIpcResult<ReadSelectedPngFileBytesResult>> {
      return invokeImportChannel<ReadSelectedPngFileBytesResult>(
        IMPORT_IPC_CHANNELS.READ_SELECTED_PNG_BYTES,
        request,
      );
    },

    getSelectedPngPreview(
      request: SelectedPngPreviewRequest,
    ): Promise<ImportIpcResult<SelectedPngPreviewResult>> {
      return invokeImportChannel<SelectedPngPreviewResult>(
        IMPORT_IPC_CHANNELS.GET_SELECTED_PNG_PREVIEW,
        request,
      );
    },

    selectMultiplePngFiles(): Promise<ImportIpcResult<SelectMultiplePngFilesResult>> {
      return invokeImportChannel<SelectMultiplePngFilesResult>(
        IMPORT_IPC_CHANNELS.SELECT_MULTIPLE_PNG,
      );
    },

    selectImportFolder(): Promise<ImportIpcResult<SelectImportFolderResult>> {
      return invokeImportChannel<SelectImportFolderResult>(
        IMPORT_IPC_CHANNELS.SELECT_IMPORT_FOLDER,
      );
    },

    selectImportZip(): Promise<ImportIpcResult<SelectImportZipFileResult>> {
      return invokeImportChannel<SelectImportZipFileResult>(IMPORT_IPC_CHANNELS.SELECT_IMPORT_ZIP);
    },

    startBatchDiscovery(
      request: StartBatchDiscoveryRequest,
    ): Promise<ImportIpcResult<StartBatchDiscoveryResult>> {
      return invokeImportChannel<StartBatchDiscoveryResult>(
        IMPORT_IPC_CHANNELS.START_BATCH_DISCOVERY,
        request,
      );
    },

    cancelBatchJob(
      request: CancelBatchImportJobRequest,
    ): Promise<ImportIpcResult<CancelBatchImportJobResult>> {
      return invokeImportChannel<CancelBatchImportJobResult>(
        IMPORT_IPC_CHANNELS.CANCEL_BATCH_JOB,
        request,
      );
    },

    finishBatchJob(
      request: FinishBatchImportJobRequest,
    ): Promise<ImportIpcResult<FinishBatchImportJobResult>> {
      return invokeImportChannel<FinishBatchImportJobResult>(
        IMPORT_IPC_CHANNELS.FINISH_BATCH_JOB,
        request,
      );
    },

    onBatchProgress(callback: (event: BatchImportProgressEvent) => void): () => void {
      return subscribeImportEvent<BatchImportProgressEvent>(
        IMPORT_IPC_EVENT_CHANNELS.BATCH_PROGRESS,
        callback,
      );
    },

    onBatchDiscoveryComplete(callback: (event: BatchDiscoveryCompleteEvent) => void): () => void {
      return subscribeImportEvent<BatchDiscoveryCompleteEvent>(
        IMPORT_IPC_EVENT_CHANNELS.BATCH_DISCOVERY_COMPLETE,
        callback,
      );
    },

    onBatchJobError(callback: (event: BatchJobErrorEvent) => void): () => void {
      return subscribeImportEvent<BatchJobErrorEvent>(
        IMPORT_IPC_EVENT_CHANNELS.BATCH_JOB_ERROR,
        callback,
      );
    },

    /** Dev-only — handler registered when the app is not packaged */
    verifyDerivativeGeneration(): Promise<ImportIpcResult<DerivativeGenerationVerificationResult>> {
      return invokeDevImportChannel<DerivativeGenerationVerificationResult>(
        DEV_IMPORT_IPC_CHANNELS.VERIFY_DERIVATIVE_GENERATION,
      );
    },
  },

  export: {
    exportShowZip(request: ExportShowZipRequest): Promise<ImportIpcResult<ExportShowZipResult>> {
      return invokeExportChannel<ExportShowZipResult>(EXPORT_IPC_CHANNELS.EXPORT_SHOW_ZIP, request);
    },

    onExportProgress(callback: (event: ShowExportProgressEvent) => void): () => void {
      return subscribeExportEvent<ShowExportProgressEvent>(EXPORT_IPC_EVENT_CHANNELS.PROGRESS, callback);
    },

    exportGangSheetPng(
      request: ExportGangSheetPngRequest,
    ): Promise<ImportIpcResult<ExportGangSheetPngResult>> {
      return invokeExportChannel<ExportGangSheetPngResult>(
        EXPORT_IPC_CHANNELS.EXPORT_GANG_SHEET_PNG,
        request,
      );
    },

    onGangSheetExportProgress(callback: (event: GangSheetExportProgressEvent) => void): () => void {
      return subscribeExportEvent<GangSheetExportProgressEvent>(
        EXPORT_IPC_EVENT_CHANNELS.GANG_SHEET_PROGRESS,
        callback,
      );
    },
  },
});
