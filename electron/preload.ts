import { contextBridge, ipcRenderer } from "electron";

import { APP_IPC_CHANNELS, isAllowedAppIpcChannel } from "./ipc/app/appIpcChannels";
import {
  DEV_IMPORT_IPC_CHANNELS,
  IMPORT_IPC_CHANNELS,
  IMPORT_IPC_EVENT_CHANNELS,
  isAllowedDevImportIpcChannel,
  isAllowedImportIpcChannel,
  isAllowedImportIpcEventChannel,
} from "./ipc/import/importIpcChannels";
import type { OpenDevToolsResult } from "../shared/types/app/appIpc.types";
import type {
  BatchDiscoveryCompleteEvent,
  BatchJobErrorEvent,
  BatchImportProgressEvent,
} from "../shared/types/import/batchImport.types";
import type { ReadSelectedPngFileBytesRequest } from "../shared/types/import/readPngFileBytes.types";
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
  SelectedPngPreviewResult,
  StartBatchDiscoveryRequest,
  StartBatchDiscoveryResult,
  ValidateSelectedPngFileResult,
} from "../shared/types/import/importIpc.types";
import type { DerivativeGenerationVerificationResult } from "../shared/types/import/derivativeGeneration.types";

function invokeAppChannel<T>(
  channel: (typeof APP_IPC_CHANNELS)[keyof typeof APP_IPC_CHANNELS],
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

  return ipcRenderer.invoke(channel) as Promise<ImportIpcResult<T>>;
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
      filePath: string,
    ): Promise<ImportIpcResult<SelectedPngPreviewResult>> {
      return invokeImportChannel<SelectedPngPreviewResult>(
        IMPORT_IPC_CHANNELS.GET_SELECTED_PNG_PREVIEW,
        filePath,
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
});
