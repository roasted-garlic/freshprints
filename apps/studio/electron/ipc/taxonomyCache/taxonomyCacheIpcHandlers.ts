import { ipcMain } from "electron";

import { TAXONOMY_MATERIALIZATION_SCHEMA_VERSION } from "@fresh-prints/shared/types/taxonomy/taxonomyMaterialization.types";

import { importIpcFailure, importIpcSuccess } from "../import/importIpcResponse";
import { TAXONOMY_CACHE_IPC_CHANNELS } from "./taxonomyCacheIpcChannels";
import {
  clearTaxonomyUserDataCache,
  readTaxonomyUserDataCache,
  writeTaxonomyUserDataCache,
  type TaxonomyUserDataCachePayload,
} from "../../services/taxonomy/taxonomyDiskCache";

function isWritePayload(value: unknown): value is TaxonomyUserDataCachePayload {
  if (!value || typeof value !== "object") return false;
  const v = value as TaxonomyUserDataCachePayload;
  return (
    typeof v.revision === "number" &&
    typeof v.contentHash === "string" &&
    typeof v.schemaVersion === "number" &&
    Array.isArray(v.categories) &&
    Array.isArray(v.tags) &&
    typeof v.savedAtMs === "number"
  );
}

export function registerTaxonomyCacheIpcHandlers(): void {
  ipcMain.handle(TAXONOMY_CACHE_IPC_CHANNELS.READ, async () => {
    try {
      const data = await readTaxonomyUserDataCache();
      return importIpcSuccess({ cache: data });
    } catch {
      return importIpcFailure("INTERNAL_ERROR", "Unable to read taxonomy disk cache.");
    }
  });

  ipcMain.handle(TAXONOMY_CACHE_IPC_CHANNELS.WRITE, async (_event, request: unknown) => {
    if (!isWritePayload(request)) {
      return importIpcFailure("INVALID_INPUT", "Invalid taxonomy cache payload.");
    }
    if (request.schemaVersion !== TAXONOMY_MATERIALIZATION_SCHEMA_VERSION) {
      return importIpcFailure("INVALID_INPUT", "Unsupported taxonomy cache schema version.");
    }
    try {
      await writeTaxonomyUserDataCache(request);
      return importIpcSuccess({ written: true });
    } catch {
      return importIpcFailure("INTERNAL_ERROR", "Unable to write taxonomy disk cache.");
    }
  });

  ipcMain.handle(TAXONOMY_CACHE_IPC_CHANNELS.CLEAR, async () => {
    try {
      await clearTaxonomyUserDataCache();
      return importIpcSuccess({ cleared: true });
    } catch {
      return importIpcFailure("INTERNAL_ERROR", "Unable to clear taxonomy disk cache.");
    }
  });
}
