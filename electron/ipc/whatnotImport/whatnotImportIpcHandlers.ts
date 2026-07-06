import { BrowserWindow, ipcMain } from "electron";

import { importIpcFailure, importIpcSuccess } from "../import/importIpcResponse";
import {
  WHATNOT_IMPORT_CONFIRMED_EVENT,
  WHATNOT_IMPORT_IPC_CHANNELS,
  WHATNOT_IMPORT_SHELL_COMPLETED_EVENT,
  WHATNOT_IMPORT_SHELL_IPC_CHANNELS,
} from "./whatnotImportIpcChannels";
import {
  closeWhatnotImportWindow,
  getWhatnotImportPanelWebContents,
  openWhatnotImportWindow,
  scanWhatnotShowCandidates,
} from "./whatnotImportWindow";
import type {
  WhatnotExistingShowSummary,
  WhatnotShowImportCompletedEvent,
  WhatnotShowImportShellConfirmPayload,
} from "../../../shared/types/whatnotImport/whatnotImport.types";

function isWhatnotShowImportShellConfirmPayload(value: unknown): value is WhatnotShowImportShellConfirmPayload {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    Array.isArray((value as WhatnotShowImportShellConfirmPayload).planEntries) &&
    Array.isArray((value as WhatnotShowImportShellConfirmPayload).excludedIndexes)
  );
}

function isWhatnotShowImportCompletedEvent(value: unknown): value is WhatnotShowImportCompletedEvent {
  if (!value || typeof value !== "object") {
    return false;
  }
  const status = (value as WhatnotShowImportCompletedEvent).status;
  return status === "succeeded" || status === "failed";
}

/** The base URL used for the most recently opened import window, so a shell confirm can be attributed. */
let lastOpenedBaseUrl: string | undefined;
/** The owner (main app) window a confirm should be forwarded to. */
let lastOwnerWindow: BrowserWindow | null = null;

export function registerWhatnotImportIpcHandlers(): void {
  ipcMain.handle(WHATNOT_IMPORT_IPC_CHANNELS.OPEN_WINDOW, (event, payload: unknown) => {
    const { baseUrl, existingShows } = (payload ?? {}) as {
      baseUrl?: unknown;
      existingShows?: unknown;
    };

    if (typeof baseUrl !== "string" || !Array.isArray(existingShows)) {
      return importIpcFailure("INVALID_INPUT", "A Whatnot show base URL and show list are required.");
    }

    const ownerWindow = BrowserWindow.fromWebContents(event.sender);
    const opened = openWhatnotImportWindow(baseUrl, ownerWindow, existingShows as WhatnotExistingShowSummary[]);

    if (!opened) {
      return importIpcFailure(
        "INVALID_INPUT",
        "Only the configured Whatnot show base URL can be opened for import.",
      );
    }

    lastOpenedBaseUrl = baseUrl;
    lastOwnerWindow = ownerWindow;

    return importIpcSuccess({ opened: true });
  });

  ipcMain.handle(WHATNOT_IMPORT_IPC_CHANNELS.CLOSE_WINDOW, () => {
    closeWhatnotImportWindow();
    return importIpcSuccess({ closed: true });
  });

  ipcMain.handle(WHATNOT_IMPORT_IPC_CHANNELS.REPORT_COMPLETED, (_event, payload: unknown) => {
    if (!isWhatnotShowImportCompletedEvent(payload)) {
      return importIpcFailure("INVALID_INPUT", "A valid import completion event is required.");
    }

    const panelWebContents = getWhatnotImportPanelWebContents();
    panelWebContents?.send(WHATNOT_IMPORT_SHELL_COMPLETED_EVENT, payload);

    if (payload.status === "succeeded") {
      closeWhatnotImportWindow();
    }

    return importIpcSuccess({ acknowledged: true });
  });

  ipcMain.handle(WHATNOT_IMPORT_SHELL_IPC_CHANNELS.SCAN, async () => {
    const planEntries = await scanWhatnotShowCandidates();

    if (!planEntries) {
      return importIpcFailure(
        "INTERNAL_ERROR",
        "The Whatnot page could not be read. Make sure it has finished loading.",
      );
    }

    return importIpcSuccess({ planEntries });
  });

  ipcMain.handle(WHATNOT_IMPORT_SHELL_IPC_CHANNELS.CONFIRM, (_event, payload: unknown) => {
    if (!isWhatnotShowImportShellConfirmPayload(payload)) {
      return importIpcFailure("INVALID_INPUT", "A valid selection is required to confirm import.");
    }

    if (!lastOwnerWindow || lastOwnerWindow.isDestroyed() || !lastOpenedBaseUrl) {
      return importIpcFailure("INTERNAL_ERROR", "The Show Queue window could not be found.");
    }

    lastOwnerWindow.webContents.send(WHATNOT_IMPORT_CONFIRMED_EVENT, {
      baseUrl: lastOpenedBaseUrl,
      planEntries: payload.planEntries,
      excludedIndexes: payload.excludedIndexes,
    });

    return importIpcSuccess({ acknowledged: true });
  });

  ipcMain.handle(WHATNOT_IMPORT_SHELL_IPC_CHANNELS.CANCEL, () => {
    closeWhatnotImportWindow();
    return importIpcSuccess({ acknowledged: true });
  });
}
