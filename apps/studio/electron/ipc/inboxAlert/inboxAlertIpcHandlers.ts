import { dialog } from "electron";
import { ipcMain } from "electron";

import type {
  ClearInboxAlertSoundRequest,
  GetInboxAlertSoundPlayableUrlRequest,
  InboxAlertSoundKind,
  SelectInboxAlertSoundRequest,
} from "@fresh-prints/shared/types/inboxAlert/inboxAlertIpc.types";

import { getActiveBrowserWindow } from "../import/importBrowserWindow";
import { importIpcFailure, importIpcSuccess } from "../import/importIpcResponse";
import { INBOX_ALERT_IPC_CHANNELS } from "./inboxAlertIpcChannels";
import {
  clearInboxAlertSoundFile,
  getStoredInboxAlertSoundFileName,
  readInboxAlertSoundDataUrl,
  saveInboxAlertSoundFile,
} from "./inboxAlertSoundStorage";

const ALLOWED_SOUND_KINDS = new Set<InboxAlertSoundKind>(["request_queued_to_show", "show_queue_full"]);

function parseSoundKind(value: unknown): InboxAlertSoundKind | null {
  return typeof value === "string" && ALLOWED_SOUND_KINDS.has(value as InboxAlertSoundKind)
    ? (value as InboxAlertSoundKind)
    : null;
}

function parseUserId(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function registerInboxAlertIpcHandlers(): void {
  ipcMain.handle(INBOX_ALERT_IPC_CHANNELS.SELECT_LOCAL_SOUND, async (_event, request: unknown) => {
    const payload = request as SelectInboxAlertSoundRequest;
    const userId = parseUserId(payload?.userId);
    const soundKind = parseSoundKind(payload?.soundKind);

    if (!userId || !soundKind) {
      return importIpcFailure("INVALID_INPUT", "A user id and sound kind are required.");
    }

    const browserWindow = getActiveBrowserWindow();
    const dialogOptions = {
      properties: ["openFile"] as Array<"openFile">,
      title: "Select alert sound",
      filters: [
        {
          name: "Audio files",
          extensions: ["mp3", "wav", "ogg", "m4a", "aac"],
        },
      ],
    };

    const dialogResult = browserWindow
      ? await dialog.showOpenDialog(browserWindow, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions);

    if (dialogResult.canceled || dialogResult.filePaths.length === 0) {
      return importIpcSuccess({ canceled: true });
    }

    const selectedPath = dialogResult.filePaths[0];

    if (!selectedPath) {
      return importIpcSuccess({ canceled: true });
    }

    try {
      const saved = saveInboxAlertSoundFile(userId, soundKind, selectedPath);

      return importIpcSuccess({
        canceled: false,
        soundKind,
        fileName: saved.fileName,
      });
    } catch {
      return importIpcFailure("INTERNAL_ERROR", "Unable to save the selected sound file.");
    }
  });

  ipcMain.handle(INBOX_ALERT_IPC_CHANNELS.GET_LOCAL_SOUND_PLAYABLE_URL, (_event, request: unknown) => {
    const payload = request as GetInboxAlertSoundPlayableUrlRequest;
    const userId = parseUserId(payload?.userId);
    const soundKind = parseSoundKind(payload?.soundKind);

    if (!userId || !soundKind) {
      return importIpcFailure("INVALID_INPUT", "A user id and sound kind are required.");
    }

    try {
      const playableUrl = readInboxAlertSoundDataUrl(userId, soundKind);

      if (!playableUrl) {
        return importIpcFailure("FILE_NOT_FOUND", "No saved sound was found for this alert.");
      }

      return importIpcSuccess({ playableUrl });
    } catch {
      return importIpcFailure("INTERNAL_ERROR", "Unable to load the saved sound file.");
    }
  });

  ipcMain.handle(INBOX_ALERT_IPC_CHANNELS.CLEAR_LOCAL_SOUND, (_event, request: unknown) => {
    const payload = request as ClearInboxAlertSoundRequest;
    const userId = parseUserId(payload?.userId);
    const soundKind = parseSoundKind(payload?.soundKind);

    if (!userId || !soundKind) {
      return importIpcFailure("INVALID_INPUT", "A user id and sound kind are required.");
    }

    try {
      const cleared = clearInboxAlertSoundFile(userId, soundKind);
      return importIpcSuccess({ cleared });
    } catch {
      return importIpcFailure("INTERNAL_ERROR", "Unable to remove the saved sound file.");
    }
  });
}

export function getStoredInboxAlertSoundLabel(userId: string, soundKind: InboxAlertSoundKind): string | null {
  return getStoredInboxAlertSoundFileName(userId, soundKind);
}
