import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import type { PrintRequest, PrintRequestItem } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import type {
  ExportShowZipResult,
  ShowExportImageRequest,
  ShowExportProgressEvent,
} from "@fresh-prints/shared/types/export/showExportIpc.types";
import {
  buildPrintRequestExportImageFilename,
  buildPrintRequestExportZipFilename,
} from "@fresh-prints/shared/utils/printRequestExportFilename";

import { buildPrintRequestExportAssets } from "../utils/buildPrintRequestExportAssets";

function formatError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useExportPrintRequestZip() {
  const { user } = useAuth();
  const [state, setState] = useState<{
    isExporting: boolean;
    error: string | null;
    result: ExportShowZipResult | null;
    progress: ShowExportProgressEvent | null;
  }>({ isExporting: false, error: null, result: null, progress: null });
  const isExportingRef = useRef(false);

  useEffect(() => window.freshPrints.export.onExportProgress((event) => {
    if (isExportingRef.current) setState((current) => ({ ...current, progress: event }));
  }), []);

  const exportPrintRequestZip = useCallback(async (
    printRequest: PrintRequest,
    items: PrintRequestItem[],
    multiplyByQuantity: boolean,
  ) => {
    if (!user || !permissionService.canManagePrintRequests(user)) return;
    isExportingRef.current = true;
    setState({ isExporting: true, error: null, result: null, progress: null });

    try {
      const { assets, error } = await buildPrintRequestExportAssets(user, printRequest, items);
      if (error) {
        isExportingRef.current = false;
        setState({ isExporting: false, error, result: null, progress: null });
        return;
      }

      const imageRequests: ShowExportImageRequest[] = assets.map((asset, index) => ({
        requestItemId: asset.requestItemId,
        downloadUrl: asset.downloadUrl,
        targetWidthPx: asset.targetWidthPx,
        targetHeightPx: asset.targetHeightPx,
        fileName: buildPrintRequestExportImageFilename({
          sequenceNumber: index + 1,
          quantity: asset.quantity,
          printWidthInches: asset.printWidthInches,
          printHeightInches: asset.printHeightInches,
          designTitle: asset.fileName,
          itemId: asset.requestItemId,
        }),
        quantity: asset.quantity,
      }));

      const ipcResult = await window.freshPrints.export.exportShowZip({
        zipFileName: buildPrintRequestExportZipFilename(printRequest.name),
        images: imageRequests,
        multiplyByQuantity,
      });
      isExportingRef.current = false;
      if (!ipcResult.success) {
        setState((current) => ({ ...current, isExporting: false, error: ipcResult.error.message }));
        return;
      }
      setState((current) => ({ ...current, isExporting: false, error: null, result: ipcResult.data }));
    } catch (error) {
      isExportingRef.current = false;
      setState((current) => ({
        ...current,
        isExporting: false,
        error: formatError(error, "Unable to export this print request's images."),
        result: null,
      }));
    }
  }, [user]);

  const reset = useCallback(() => {
    isExportingRef.current = false;
    setState({ isExporting: false, error: null, result: null, progress: null });
  }, []);

  return { ...state, exportPrintRequestZip, reset };
}
