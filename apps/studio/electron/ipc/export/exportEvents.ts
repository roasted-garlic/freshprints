import type { WebContents } from "electron";

import type { GangSheetExportProgressEvent } from "@fresh-prints/shared/types/export/gangSheetExportIpc.types";
import type { ShowExportProgressEvent } from "@fresh-prints/shared/types/export/showExportIpc.types";
import { EXPORT_IPC_EVENT_CHANNELS } from "./exportIpcChannels";

export function emitExportProgress(webContents: WebContents, event: ShowExportProgressEvent): void {
  if (webContents.isDestroyed()) {
    return;
  }

  webContents.send(EXPORT_IPC_EVENT_CHANNELS.PROGRESS, event);
}

export function emitGangSheetExportProgress(
  webContents: WebContents,
  event: GangSheetExportProgressEvent,
): void {
  if (webContents.isDestroyed()) {
    return;
  }

  webContents.send(EXPORT_IPC_EVENT_CHANNELS.GANG_SHEET_PROGRESS, event);
}
