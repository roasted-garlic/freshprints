import type { WindowMetricsResult } from "@fresh-prints/shared/types/app/appIpc.types";

import { isElectronDesktop } from "../utils/isElectronDesktop";

export const viewportDebugService = {
  isAvailable(): boolean {
    return isElectronDesktop();
  },

  async getWindowMetrics(): Promise<WindowMetricsResult> {
    if (!isElectronDesktop()) {
      throw new Error("Viewport debug is only available in the desktop app.");
    }

    const result = await window.freshPrints.app.getWindowMetrics();

    if (!result.success) {
      throw new Error(result.error.message);
    }

    return result.data;
  },

  async setMinimumWindowSize(width: number, height: number) {
    if (!isElectronDesktop()) {
      throw new Error("Viewport debug is only available in the desktop app.");
    }

    const result = await window.freshPrints.app.setMinimumWindowSize({ width, height });

    if (!result.success) {
      throw new Error(result.error.message);
    }

    return result.data;
  },

  async resetMinimumWindowSize(mode: "default" | "unlock" = "unlock") {
    if (!isElectronDesktop()) {
      throw new Error("Viewport debug is only available in the desktop app.");
    }

    const result = await window.freshPrints.app.resetMinimumWindowSize({ mode });

    if (!result.success) {
      throw new Error(result.error.message);
    }

    return result.data;
  },
};
