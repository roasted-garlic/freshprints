import { isElectronDesktop } from "../utils/isElectronDesktop";

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
};
