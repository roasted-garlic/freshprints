"use strict";
const electron = require("electron");
const APP_OPEN_DEV_TOOLS = "fresh-prints:app:open-dev-tools";
const APP_IPC_CHANNELS = {
  OPEN_DEV_TOOLS: APP_OPEN_DEV_TOOLS
};
const ALLOWED_APP_IPC_CHANNELS = new Set(Object.values(APP_IPC_CHANNELS));
function isAllowedAppIpcChannel(channel) {
  return ALLOWED_APP_IPC_CHANNELS.has(channel);
}
const IMPORT_SELECT_SINGLE_PNG = "fresh-prints:import:select-single-png";
const IMPORT_VALIDATE_SELECTED_PNG = "fresh-prints:import:validate-selected-png";
const IMPORT_READ_SELECTED_PNG_BYTES = "fresh-prints:import:read-selected-png-bytes";
const IMPORT_GET_SELECTED_PNG_PREVIEW = "fresh-prints:import:get-selected-png-preview";
const IMPORT_SELECT_MULTIPLE_PNG = "fresh-prints:import:select-multiple-png";
const IMPORT_SELECT_IMPORT_FOLDER = "fresh-prints:import:select-import-folder";
const IMPORT_SELECT_IMPORT_ZIP = "fresh-prints:import:select-import-zip";
const IMPORT_START_BATCH_DISCOVERY = "fresh-prints:import:start-batch-discovery";
const IMPORT_CANCEL_BATCH_JOB = "fresh-prints:import:cancel-batch-job";
const IMPORT_FINISH_BATCH_JOB = "fresh-prints:import:finish-batch-job";
const IMPORT_CLEAR_SINGLE_PNG_IMPORT = "fresh-prints:import:clear-single-png-import";
const IMPORT_BATCH_PROGRESS = "fresh-prints:import:batch-progress";
const IMPORT_BATCH_DISCOVERY_COMPLETE = "fresh-prints:import:batch-discovery-complete";
const IMPORT_BATCH_JOB_ERROR = "fresh-prints:import:batch-job-error";
const IMPORT_VERIFY_DERIVATIVE_GENERATION = "fresh-prints:import:verify-derivative-generation";
const IMPORT_IPC_CHANNELS = {
  SELECT_SINGLE_PNG: IMPORT_SELECT_SINGLE_PNG,
  VALIDATE_SELECTED_PNG: IMPORT_VALIDATE_SELECTED_PNG,
  READ_SELECTED_PNG_BYTES: IMPORT_READ_SELECTED_PNG_BYTES,
  GET_SELECTED_PNG_PREVIEW: IMPORT_GET_SELECTED_PNG_PREVIEW,
  SELECT_MULTIPLE_PNG: IMPORT_SELECT_MULTIPLE_PNG,
  SELECT_IMPORT_FOLDER: IMPORT_SELECT_IMPORT_FOLDER,
  SELECT_IMPORT_ZIP: IMPORT_SELECT_IMPORT_ZIP,
  START_BATCH_DISCOVERY: IMPORT_START_BATCH_DISCOVERY,
  CANCEL_BATCH_JOB: IMPORT_CANCEL_BATCH_JOB,
  FINISH_BATCH_JOB: IMPORT_FINISH_BATCH_JOB,
  CLEAR_SINGLE_PNG_IMPORT: IMPORT_CLEAR_SINGLE_PNG_IMPORT
};
const DEV_IMPORT_IPC_CHANNELS = {
  VERIFY_DERIVATIVE_GENERATION: IMPORT_VERIFY_DERIVATIVE_GENERATION
};
const IMPORT_IPC_EVENT_CHANNELS = {
  BATCH_PROGRESS: IMPORT_BATCH_PROGRESS,
  BATCH_DISCOVERY_COMPLETE: IMPORT_BATCH_DISCOVERY_COMPLETE,
  BATCH_JOB_ERROR: IMPORT_BATCH_JOB_ERROR
};
const ALLOWED_IMPORT_IPC_CHANNELS = new Set(Object.values(IMPORT_IPC_CHANNELS));
const ALLOWED_IMPORT_IPC_EVENT_CHANNELS = new Set(
  Object.values(IMPORT_IPC_EVENT_CHANNELS)
);
const ALLOWED_DEV_IMPORT_IPC_CHANNELS = new Set(Object.values(DEV_IMPORT_IPC_CHANNELS));
function isAllowedImportIpcChannel(channel) {
  return ALLOWED_IMPORT_IPC_CHANNELS.has(channel);
}
function isAllowedImportIpcEventChannel(channel) {
  return ALLOWED_IMPORT_IPC_EVENT_CHANNELS.has(channel);
}
function isAllowedDevImportIpcChannel(channel) {
  return ALLOWED_DEV_IMPORT_IPC_CHANNELS.has(channel);
}
function invokeAppChannel(channel) {
  if (!isAllowedAppIpcChannel(channel)) {
    return Promise.resolve({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "The requested app operation is not allowed."
      }
    });
  }
  return electron.ipcRenderer.invoke(channel);
}
function invokeImportChannel(channel, payload) {
  if (!isAllowedImportIpcChannel(channel)) {
    return Promise.resolve({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "The requested import operation is not allowed."
      }
    });
  }
  return electron.ipcRenderer.invoke(channel, payload);
}
function invokeDevImportChannel(channel) {
  if (!isAllowedDevImportIpcChannel(channel)) {
    return Promise.resolve({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "The requested dev import operation is not allowed."
      }
    });
  }
  return electron.ipcRenderer.invoke(channel);
}
function subscribeImportEvent(channel, callback) {
  if (!isAllowedImportIpcEventChannel(channel)) {
    return () => void 0;
  }
  const listener = (_ipcEvent, payload) => {
    callback(payload);
  };
  electron.ipcRenderer.on(channel, listener);
  return () => {
    electron.ipcRenderer.removeListener(channel, listener);
  };
}
electron.contextBridge.exposeInMainWorld("freshPrints", {
  app: {
    openDevTools() {
      return invokeAppChannel(APP_IPC_CHANNELS.OPEN_DEV_TOOLS);
    }
  },
  imports: {
    selectSinglePngFile() {
      return invokeImportChannel(IMPORT_IPC_CHANNELS.SELECT_SINGLE_PNG);
    },
    validateSelectedPngFile(filePath) {
      return invokeImportChannel(
        IMPORT_IPC_CHANNELS.VALIDATE_SELECTED_PNG,
        filePath
      );
    },
    clearSinglePngImport() {
      return invokeImportChannel(
        IMPORT_IPC_CHANNELS.CLEAR_SINGLE_PNG_IMPORT
      );
    },
    readSelectedPngFileBytes(request) {
      return invokeImportChannel(
        IMPORT_IPC_CHANNELS.READ_SELECTED_PNG_BYTES,
        request
      );
    },
    getSelectedPngPreview(filePath) {
      return invokeImportChannel(
        IMPORT_IPC_CHANNELS.GET_SELECTED_PNG_PREVIEW,
        filePath
      );
    },
    selectMultiplePngFiles() {
      return invokeImportChannel(
        IMPORT_IPC_CHANNELS.SELECT_MULTIPLE_PNG
      );
    },
    selectImportFolder() {
      return invokeImportChannel(
        IMPORT_IPC_CHANNELS.SELECT_IMPORT_FOLDER
      );
    },
    selectImportZip() {
      return invokeImportChannel(IMPORT_IPC_CHANNELS.SELECT_IMPORT_ZIP);
    },
    startBatchDiscovery(request) {
      return invokeImportChannel(
        IMPORT_IPC_CHANNELS.START_BATCH_DISCOVERY,
        request
      );
    },
    cancelBatchJob(request) {
      return invokeImportChannel(
        IMPORT_IPC_CHANNELS.CANCEL_BATCH_JOB,
        request
      );
    },
    finishBatchJob(request) {
      return invokeImportChannel(
        IMPORT_IPC_CHANNELS.FINISH_BATCH_JOB,
        request
      );
    },
    onBatchProgress(callback) {
      return subscribeImportEvent(
        IMPORT_IPC_EVENT_CHANNELS.BATCH_PROGRESS,
        callback
      );
    },
    onBatchDiscoveryComplete(callback) {
      return subscribeImportEvent(
        IMPORT_IPC_EVENT_CHANNELS.BATCH_DISCOVERY_COMPLETE,
        callback
      );
    },
    onBatchJobError(callback) {
      return subscribeImportEvent(
        IMPORT_IPC_EVENT_CHANNELS.BATCH_JOB_ERROR,
        callback
      );
    },
    /** Dev-only — handler registered when the app is not packaged */
    verifyDerivativeGeneration() {
      return invokeDevImportChannel(
        DEV_IMPORT_IPC_CHANNELS.VERIFY_DERIVATIVE_GENERATION
      );
    }
  }
});
