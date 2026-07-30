import { ipcMain } from "electron";

import type { FetchCatalogAssetJsonRequest } from "@fresh-prints/shared/types/catalogAsset/catalogAssetIpc.types";

import {
  CatalogAssetFetchError,
  fetchCatalogAssetJson,
} from "../../services/catalogAsset/fetchCatalogAssetJson";
import { CATALOG_ASSET_IPC_CHANNELS } from "./catalogAssetIpcChannels";

export function registerCatalogAssetIpcHandlers(): void {
  ipcMain.handle(CATALOG_ASSET_IPC_CHANNELS.FETCH_JSON, async (_event, payload: unknown) => {
    if (!payload || typeof payload !== "object") {
      return {
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "A catalog asset request is required.",
          diagnostics: { durationMs: 0, failureCode: "invalid-input", failureStage: "electron-ipc" },
        },
      };
    }

    const request = payload as Partial<FetchCatalogAssetJsonRequest>;
    if (typeof request.downloadUrl !== "string" || !request.downloadUrl.trim()) {
      return {
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "A download URL is required.",
          diagnostics: { durationMs: 0, failureCode: "invalid-input", failureStage: "electron-ipc" },
        },
      };
    }

    try {
      const result = await fetchCatalogAssetJson(request.downloadUrl.trim());
      return { success: true, data: result };
    } catch (error) {
      const diagnostics =
        error instanceof CatalogAssetFetchError
          ? error.diagnostics
          : {
              durationMs: 0,
              failureCode: "electron-ipc-unknown",
              failureStage: "electron-ipc" as const,
            };
      return {
        success: false,
        error: {
          code: "CATALOG_ASSET_FETCH_FAILED",
          message: error instanceof Error ? error.message : "Unable to fetch that catalog asset.",
          diagnostics,
        },
      };
    }
  });
}
