import type { WebContents } from "electron";

import type {
  BatchDiscoveryCompleteEvent,
  BatchImportProgressEvent,
  BatchJobErrorEvent,
} from "../../../shared/types/import/batchImport.types";
import { IMPORT_IPC_EVENT_CHANNELS } from "./importIpcChannels";

export function emitBatchImportProgress(
  webContents: WebContents,
  event: BatchImportProgressEvent,
): void {
  if (webContents.isDestroyed()) {
    return;
  }

  webContents.send(IMPORT_IPC_EVENT_CHANNELS.BATCH_PROGRESS, event);
}

export function emitBatchDiscoveryComplete(
  webContents: WebContents,
  event: BatchDiscoveryCompleteEvent,
): void {
  if (webContents.isDestroyed()) {
    return;
  }

  webContents.send(IMPORT_IPC_EVENT_CHANNELS.BATCH_DISCOVERY_COMPLETE, event);
}

export function emitBatchJobError(webContents: WebContents, event: BatchJobErrorEvent): void {
  if (webContents.isDestroyed()) {
    return;
  }

  webContents.send(IMPORT_IPC_EVENT_CHANNELS.BATCH_JOB_ERROR, event);
}
