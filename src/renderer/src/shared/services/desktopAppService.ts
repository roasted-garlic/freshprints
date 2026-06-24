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
};
