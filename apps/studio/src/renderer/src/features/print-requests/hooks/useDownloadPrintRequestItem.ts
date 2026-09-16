import { useCallback, useRef, useState } from "react";

import type { PrintRequest, PrintRequestItem } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import { buildPrintRequestExportItemFilename } from "@fresh-prints/shared/utils/printRequestExportFilename";

import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { buildPrintRequestExportAssets } from "../utils/buildPrintRequestExportAssets";

export type PrintRequestItemDownloadStatus = "idle" | "downloading" | "success" | "error";

export interface PrintRequestItemDownloadState {
  status: PrintRequestItemDownloadStatus;
  message?: string;
}

function formatError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useDownloadPrintRequestItem() {
  const { user } = useAuth();
  const [statesByItemId, setStatesByItemId] = useState<Record<string, PrintRequestItemDownloadState>>({});
  const inFlightItemIdsRef = useRef(new Set<string>());

  const setItemState = useCallback((itemId: string, state: PrintRequestItemDownloadState) => {
    setStatesByItemId((current) => ({ ...current, [itemId]: state }));
  }, []);

  const dismissItemDownloadState = useCallback((itemId: string) => {
    setStatesByItemId((current) => {
      if (!(itemId in current)) {
        return current;
      }

      const next = { ...current };
      delete next[itemId];
      return next;
    });
  }, []);

  const downloadPrintRequestItem = useCallback(async (printRequest: PrintRequest, item: PrintRequestItem) => {
    if (
      !user ||
      !permissionService.canManagePrintRequests(user) ||
      inFlightItemIdsRef.current.has(item.id)
    ) {
      return;
    }

    inFlightItemIdsRef.current.add(item.id);
    setItemState(item.id, { status: "downloading" });

    try {
      const { assets, error } = await buildPrintRequestExportAssets(user, printRequest, [item]);
      if (error || assets.length !== 1 || !assets[0]) {
        throw new Error(error ?? `Unable to resolve request item ${item.id}.`);
      }

      const asset = assets[0];
      const ipcResult = await window.freshPrints.export.downloadExportImage({
        requestItemId: asset.requestItemId,
        downloadUrl: asset.downloadUrl,
        targetWidthPx: asset.targetWidthPx,
        targetHeightPx: asset.targetHeightPx,
        fileName: buildPrintRequestExportItemFilename({
          printWidthInches: asset.printWidthInches,
          printHeightInches: asset.printHeightInches,
          designTitle: asset.fileName,
          itemId: asset.requestItemId,
        }),
      });

      if (!ipcResult.success) {
        throw new Error(ipcResult.error.message);
      }

      if (ipcResult.data.canceled) {
        setItemState(item.id, { status: "idle" });
        return;
      }

      setItemState(item.id, {
        status: "success",
        message: ipcResult.data.warning?.message ?? "PNG saved.",
      });
    } catch (error) {
      setItemState(item.id, {
        status: "error",
        message: formatError(error, "Unable to download this request item."),
      });
    } finally {
      inFlightItemIdsRef.current.delete(item.id);
    }
  }, [setItemState, user]);

  return { dismissItemDownloadState, downloadPrintRequestItem, statesByItemId };
}
