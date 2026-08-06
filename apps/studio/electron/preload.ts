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
  INBOX_ALERT_IPC_CHANNELS,
  isAllowedInboxAlertIpcChannel,
} from "./ipc/inboxAlert/inboxAlertIpcChannels";
import {
  WHATNOT_IMPORT_CONFIRMED_EVENT,
  WHATNOT_IMPORT_IPC_CHANNELS,
  isAllowedWhatnotImportIpcChannel,
} from "./ipc/whatnotImport/whatnotImportIpcChannels";
import {
  STUDIO_UPDATE_IPC_CHANNELS,
  STUDIO_UPDATE_STATE_CHANGED,
  isAllowedStudioUpdateIpcChannel,
} from "./ipc/studioUpdate/studioUpdateIpcChannels";
import type {
  ClearInboxAlertSoundRequest,
  ClearInboxAlertSoundResult,
  GetInboxAlertSoundPlayableUrlRequest,
  GetInboxAlertSoundPlayableUrlResult,
  SelectInboxAlertSoundRequest,
  SelectInboxAlertSoundResult,
} from "@fresh-prints/shared/types/inboxAlert/inboxAlertIpc.types";
import type {
  ConfirmCloseResult,
  DownloadUrlToFileRequest,
  DownloadUrlToFileResult,
  OpenDevToolsResult,
  OpenExternalLinkResult,
  SetMinimumWindowSizeRequest,
  SetMinimumWindowSizeResult,
  SetUploadActiveResult,
  ResetMinimumWindowSizeRequest,
  WindowMetricsResult,
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
  CheckForStudioUpdateResult,
  DownloadStudioUpdateResult,
  PostponeStudioUpdateResult,
  RestartAndInstallStudioUpdateResult,
  StudioUpdateState,
} from "@fresh-prints/shared/types/studioUpdate/studioUpdateIpc.types";
import type {
  FirebaseDebugCommand,
  OpenFirebaseDebugWindowRequest,
} from "@fresh-prints/shared/types/firebaseDebug/firebaseDebugIpc.types";
import type { FirestoreTraceSnapshot } from "@fresh-prints/shared/utils/firestoreUsageTrace";
import {
  FIREBASE_DEBUG_IPC_CHANNELS,
  isAllowedFirebaseDebugIpcChannel,
} from "./ipc/firebaseDebug/firebaseDebugIpcChannels";
import type { AiQueueTraceEventInput, AiQueueTraceSnapshot } from "@fresh-prints/shared/utils/aiQueueTrace";
import {
  AI_QUEUE_TRACE_IPC_CHANNELS,
  isAllowedAiQueueTraceIpcChannel,
} from "./ipc/aiQueueTrace/aiQueueTraceIpcChannels";
import type {
  ClearGangSheetCacheRequest,
  DownloadCachedGangSheetRequest,
  DownloadCachedGangSheetResult,
  ExportCachedGangSheetsRequest,
  ExportCachedGangSheetsResult,
  GenerateGangSheetPngRequest,
  GenerateGangSheetPngResult,
  GetGangSheetCacheStatusRequest,
  GetGangSheetCacheStatusResult,
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

function invokeInboxAlertChannel<T>(
  channel: (typeof INBOX_ALERT_IPC_CHANNELS)[keyof typeof INBOX_ALERT_IPC_CHANNELS],
  payload?: unknown,
): Promise<ImportIpcResult<T>> {
  if (!isAllowedInboxAlertIpcChannel(channel)) {
    return Promise.resolve({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "The requested inbox alert operation is not allowed.",
      },
    });
  }

  return ipcRenderer.invoke(channel, payload) as Promise<ImportIpcResult<T>>;
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

function invokeStudioUpdateChannel<T>(
  channel: (typeof STUDIO_UPDATE_IPC_CHANNELS)[keyof typeof STUDIO_UPDATE_IPC_CHANNELS],
): Promise<ImportIpcResult<T>> {
  if (!isAllowedStudioUpdateIpcChannel(channel)) {
    return Promise.resolve({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "The requested Studio update operation is not allowed.",
      },
    });
  }

  return ipcRenderer.invoke(channel) as Promise<ImportIpcResult<T>>;
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
  firebaseDebug: {
    open(request: OpenFirebaseDebugWindowRequest): Promise<{ opened: boolean }> {
      if (!isAllowedFirebaseDebugIpcChannel(FIREBASE_DEBUG_IPC_CHANNELS.OPEN)) {
        return Promise.resolve({ opened: false });
      }
      return ipcRenderer.invoke(FIREBASE_DEBUG_IPC_CHANNELS.OPEN, request);
    },
    publishSnapshot(snapshot: FirestoreTraceSnapshot): void {
      ipcRenderer.send(FIREBASE_DEBUG_IPC_CHANNELS.PUBLISH_SNAPSHOT, snapshot);
    },
    getSnapshot(): Promise<FirestoreTraceSnapshot | null> {
      return ipcRenderer.invoke(FIREBASE_DEBUG_IPC_CHANNELS.GET_SNAPSHOT);
    },
    onSnapshot(callback: (snapshot: FirestoreTraceSnapshot) => void): () => void {
      const listener = (_event: Electron.IpcRendererEvent, snapshot: FirestoreTraceSnapshot) =>
        callback(snapshot);
      ipcRenderer.on(FIREBASE_DEBUG_IPC_CHANNELS.SNAPSHOT, listener);
      return () => ipcRenderer.removeListener(FIREBASE_DEBUG_IPC_CHANNELS.SNAPSHOT, listener);
    },
    onCommand(callback: (command: FirebaseDebugCommand) => void): () => void {
      const listener = (_event: Electron.IpcRendererEvent, command: FirebaseDebugCommand) =>
        callback(command);
      ipcRenderer.on(FIREBASE_DEBUG_IPC_CHANNELS.COMMAND, listener);
      return () => ipcRenderer.removeListener(FIREBASE_DEBUG_IPC_CHANNELS.COMMAND, listener);
    },
    sendCommand(command: FirebaseDebugCommand): void {
      ipcRenderer.send(FIREBASE_DEBUG_IPC_CHANNELS.COMMAND, command);
    },
    close(): void {
      ipcRenderer.send(FIREBASE_DEBUG_IPC_CHANNELS.CLOSE);
    },
  },

  aiQueueTrace: {
    append(event: AiQueueTraceEventInput): void {
      if (!isAllowedAiQueueTraceIpcChannel(AI_QUEUE_TRACE_IPC_CHANNELS.APPEND)) return;
      ipcRenderer.send(AI_QUEUE_TRACE_IPC_CHANNELS.APPEND, event);
    },
    getSnapshot(): Promise<AiQueueTraceSnapshot> {
      return ipcRenderer.invoke(AI_QUEUE_TRACE_IPC_CHANNELS.GET_SNAPSHOT);
    },
    reset(): void {
      if (!isAllowedAiQueueTraceIpcChannel(AI_QUEUE_TRACE_IPC_CHANNELS.RESET)) return;
      ipcRenderer.send(AI_QUEUE_TRACE_IPC_CHANNELS.RESET);
    },
    isEnabled(): Promise<boolean> {
      return ipcRenderer.invoke(AI_QUEUE_TRACE_IPC_CHANNELS.IS_ENABLED);
    },
  },

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

    downloadUrlToFile(
      request: DownloadUrlToFileRequest,
    ): Promise<ImportIpcResult<DownloadUrlToFileResult>> {
      return invokeAppChannel<DownloadUrlToFileResult>(
        APP_IPC_CHANNELS.DOWNLOAD_URL_TO_FILE,
        request,
      );
    },

    getWindowMetrics(): Promise<ImportIpcResult<WindowMetricsResult>> {
      return invokeAppChannel<WindowMetricsResult>(APP_IPC_CHANNELS.GET_WINDOW_METRICS);
    },

    setMinimumWindowSize(
      size: SetMinimumWindowSizeRequest,
    ): Promise<ImportIpcResult<SetMinimumWindowSizeResult>> {
      return invokeAppChannel<SetMinimumWindowSizeResult>(
        APP_IPC_CHANNELS.SET_MINIMUM_WINDOW_SIZE,
        size,
      );
    },

    resetMinimumWindowSize(
      request?: ResetMinimumWindowSizeRequest,
    ): Promise<ImportIpcResult<SetMinimumWindowSizeResult>> {
      return invokeAppChannel<SetMinimumWindowSizeResult>(
        APP_IPC_CHANNELS.RESET_MINIMUM_WINDOW_SIZE,
        request ?? {},
      );
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

  inboxAlert: {
    selectAndSaveLocalSound(
      request: SelectInboxAlertSoundRequest,
    ): Promise<ImportIpcResult<SelectInboxAlertSoundResult>> {
      return invokeInboxAlertChannel<SelectInboxAlertSoundResult>(
        INBOX_ALERT_IPC_CHANNELS.SELECT_LOCAL_SOUND,
        request,
      );
    },

    getLocalSoundPlayableUrl(
      request: GetInboxAlertSoundPlayableUrlRequest,
    ): Promise<ImportIpcResult<GetInboxAlertSoundPlayableUrlResult>> {
      return invokeInboxAlertChannel<GetInboxAlertSoundPlayableUrlResult>(
        INBOX_ALERT_IPC_CHANNELS.GET_LOCAL_SOUND_PLAYABLE_URL,
        request,
      );
    },

    clearLocalSound(
      request: ClearInboxAlertSoundRequest,
    ): Promise<ImportIpcResult<ClearInboxAlertSoundResult>> {
      return invokeInboxAlertChannel<ClearInboxAlertSoundResult>(
        INBOX_ALERT_IPC_CHANNELS.CLEAR_LOCAL_SOUND,
        request,
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

    generateGangSheetPng(
      request: GenerateGangSheetPngRequest,
    ): Promise<ImportIpcResult<GenerateGangSheetPngResult>> {
      return invokeExportChannel<GenerateGangSheetPngResult>(
        EXPORT_IPC_CHANNELS.GENERATE_GANG_SHEET_PNG,
        request,
      );
    },

    exportCachedGangSheets(
      request: ExportCachedGangSheetsRequest,
    ): Promise<ImportIpcResult<ExportCachedGangSheetsResult>> {
      return invokeExportChannel<ExportCachedGangSheetsResult>(
        EXPORT_IPC_CHANNELS.EXPORT_CACHED_GANG_SHEETS,
        request,
      );
    },

    downloadCachedGangSheet(
      request: DownloadCachedGangSheetRequest,
    ): Promise<ImportIpcResult<DownloadCachedGangSheetResult>> {
      return invokeExportChannel<DownloadCachedGangSheetResult>(
        EXPORT_IPC_CHANNELS.DOWNLOAD_CACHED_GANG_SHEET,
        request,
      );
    },

    clearGangSheetCache(request: ClearGangSheetCacheRequest): Promise<ImportIpcResult<{ cleared: boolean }>> {
      return invokeExportChannel<{ cleared: boolean }>(EXPORT_IPC_CHANNELS.CLEAR_GANG_SHEET_CACHE, request);
    },

    clearAllGangSheetCache(): Promise<ImportIpcResult<{ cleared: boolean }>> {
      return invokeExportChannel<{ cleared: boolean }>(EXPORT_IPC_CHANNELS.CLEAR_ALL_GANG_SHEET_CACHE);
    },

    getGangSheetCacheStatus(
      request: GetGangSheetCacheStatusRequest,
    ): Promise<ImportIpcResult<GetGangSheetCacheStatusResult>> {
      return invokeExportChannel<GetGangSheetCacheStatusResult>(
        EXPORT_IPC_CHANNELS.GET_GANG_SHEET_CACHE_STATUS,
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

  studioUpdate: {
    getState(): Promise<ImportIpcResult<StudioUpdateState>> {
      return invokeStudioUpdateChannel<StudioUpdateState>(STUDIO_UPDATE_IPC_CHANNELS.GET_STATE);
    },

    checkForUpdate(): Promise<ImportIpcResult<CheckForStudioUpdateResult>> {
      return invokeStudioUpdateChannel<CheckForStudioUpdateResult>(
        STUDIO_UPDATE_IPC_CHANNELS.CHECK,
      );
    },

    downloadUpdate(): Promise<ImportIpcResult<DownloadStudioUpdateResult>> {
      return invokeStudioUpdateChannel<DownloadStudioUpdateResult>(
        STUDIO_UPDATE_IPC_CHANNELS.DOWNLOAD,
      );
    },

    restartAndInstall(): Promise<ImportIpcResult<RestartAndInstallStudioUpdateResult>> {
      return invokeStudioUpdateChannel<RestartAndInstallStudioUpdateResult>(
        STUDIO_UPDATE_IPC_CHANNELS.RESTART_AND_INSTALL,
      );
    },

    postpone(): Promise<ImportIpcResult<PostponeStudioUpdateResult>> {
      return invokeStudioUpdateChannel<PostponeStudioUpdateResult>(
        STUDIO_UPDATE_IPC_CHANNELS.POSTPONE,
      );
    },

    onStateChanged(callback: (state: StudioUpdateState) => void): () => void {
      const listener = (_event: Electron.IpcRendererEvent, state: StudioUpdateState) =>
        callback(state);
      ipcRenderer.on(STUDIO_UPDATE_STATE_CHANGED, listener);
      return () => ipcRenderer.removeListener(STUDIO_UPDATE_STATE_CHANGED, listener);
    },
  },
});
