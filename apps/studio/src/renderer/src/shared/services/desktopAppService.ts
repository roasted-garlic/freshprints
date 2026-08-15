import { isSafeExternalLinkUrl } from "@fresh-prints/shared/utils/externalLinkSafety";
import { isElectronDesktop } from "../utils/isElectronDesktop";
import type { UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";
import type {
  WhatnotExistingShowSummary,
  WhatnotShowImportCompletedEvent,
  WhatnotShowImportConfirmedEvent,
} from "@fresh-prints/shared/types/whatnotImport/whatnotImport.types";

export const desktopAppService = {
  async openDevTools() {
    if (!isElectronDesktop()) {
      throw new Error("Desktop app APIs are not available in this environment.");
    }

    const result = await window.freshPrints.app.openDevTools();

    if (!result.success) {
      throw new Error(result.error.message);
    }

    return result.data;
  },

  async setUploadActive(active: boolean): Promise<void> {
    if (!isElectronDesktop()) {
      return;
    }

    await window.freshPrints.app.setUploadActive(active);
  },

  async confirmClose(): Promise<void> {
    if (!isElectronDesktop()) {
      return;
    }

    await window.freshPrints.app.confirmClose();
  },

  onConfirmCloseRequested(callback: () => void): () => void {
    if (!isElectronDesktop()) {
      return () => undefined;
    }

    return window.freshPrints.app.onConfirmCloseRequested(callback);
  },

  /**
   * Opens an http(s) link, preferring a window on the same display as the app when running as
   * Electron desktop. Falls back to a normal browser tab outside of Electron (e.g. local web
   * preview). Silently no-ops for anything that isn't a safe http(s) URL.
   */
  async openExternalLink(url: string): Promise<void> {
    if (!isSafeExternalLinkUrl(url)) {
      return;
    }

    if (!isElectronDesktop()) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    await window.freshPrints.app.openExternalLink(url);
  },

  /**
   * Saves a Firebase Storage download URL via Electron main (save dialog).
   * Outside Electron, falls back to opening the URL in a new tab.
   */
  async downloadUrlToFile(downloadUrl: string, fileName: string): Promise<"saved" | "canceled"> {
    if (!isElectronDesktop()) {
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
      return "saved";
    }

    const result = await window.freshPrints.app.downloadUrlToFile({ downloadUrl, fileName });
    if (!result.success) {
      throw new Error(result.error.message);
    }
    return result.data.canceled ? "canceled" : "saved";
  },
};

export const whatnotImportDesktopService = {
  isAvailable(): boolean {
    return isElectronDesktop();
  },

  /**
   * Opens the split Whatnot import window: the configured base URL renders on the left via a
   * native view, while a local HTML "shell" renders scan/import controls on the right. Requires
   * the caller's currently-loaded local shows so the shell (which has no app code of its own) can
   * classify scanned candidates as create/update/unchanged. Converts each show's `scheduledStartAt`
   * (a Firestore `Timestamp` class instance) to a plain epoch-ms number here, in the renderer —
   * `Timestamp` loses its prototype (and so `.toDate()`) when structured-cloned across
   * `ipcRenderer.invoke`, so the main process must never be handed one directly.
   */
  async openImportWindow(baseUrl: string, existingShows: UpcomingShow[]): Promise<void> {
    if (!isElectronDesktop()) {
      throw new Error("Importing Whatnot shows requires the Fresh Prints desktop app.");
    }

    const existingShowSummaries: WhatnotExistingShowSummary[] = existingShows
      .filter((show): show is UpcomingShow & { source: "whatnot"; whatnotShowId: string } =>
        show.source === "whatnot" && typeof show.whatnotShowId === "string" && Boolean(show.whatnotShowId.trim()),
      )
      .map((show) => ({
        id: show.id,
        whatnotShowId: show.whatnotShowId,
        title: show.title,
        whatnotUrl: show.whatnotUrl,
        scheduledStartAtMs: show.scheduledStartAt?.toDate().getTime(),
      }));

    const result = await window.freshPrints.whatnotImport.openImportWindow(baseUrl, existingShowSummaries);

    if (!result.success) {
      throw new Error(result.error.message);
    }
  },

  async closeImportWindow(): Promise<void> {
    if (!isElectronDesktop()) {
      return;
    }

    await window.freshPrints.whatnotImport.closeImportWindow();
  },

  /** Fires when staff confirms a selection in the import window's shell panel. */
  onImportConfirmed(callback: (event: WhatnotShowImportConfirmedEvent) => void): () => void {
    if (!isElectronDesktop()) {
      return () => undefined;
    }

    return window.freshPrints.whatnotImport.onImportConfirmed(callback);
  },

  async reportImportCompleted(event: WhatnotShowImportCompletedEvent): Promise<void> {
    if (!isElectronDesktop()) {
      return;
    }

    await window.freshPrints.whatnotImport.reportImportCompleted(event);
  },
};
