import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import type { PrintRequest, PrintRequestItem } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import type {
  CachedGangSheetSheetMeta,
  GenerateGangSheetPngResult,
  GangSheetExportProgressEvent,
  GangSheetExportImageRequest,
} from "@fresh-prints/shared/types/export/gangSheetExportIpc.types";
import type { ShowExportImageWarning } from "@fresh-prints/shared/types/export/showExportIpc.types";
import { buildPrintRequestGangSheetBaseFileName, buildPrintRequestGangSheetCacheScope } from "@fresh-prints/shared/utils/printRequestExportFilename";
import { buildPrintRequestExportAssets } from "../utils/buildPrintRequestExportAssets";
import type { GangSheetLayoutSettings } from "../../upcoming-shows/hooks/useExportGangSheetPng";

function formatError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useGeneratePrintRequestGangSheet() {
  const { user } = useAuth();
  const [state, setState] = useState<{
    isGenerating: boolean;
    isExporting: boolean;
    error: string | null;
    progress: GangSheetExportProgressEvent | null;
    generated: GenerateGangSheetPngResult | null;
    lastSavedPaths: string[];
  }>({ isGenerating: false, isExporting: false, error: null, progress: null, generated: null, lastSavedPaths: [] });
  const isBusyRef = useRef(false);

  useEffect(() => window.freshPrints.export.onGangSheetExportProgress((event) => {
    if (isBusyRef.current) setState((current) => ({ ...current, progress: event }));
  }), []);

  const generate = useCallback(async (
    printRequest: PrintRequest,
    items: PrintRequestItem[],
    settings: GangSheetLayoutSettings,
  ) => {
    if (!user || !permissionService.canManagePrintRequests(user)) return;
    isBusyRef.current = true;
    setState((current) => ({ ...current, isGenerating: true, isExporting: false, error: null, progress: null, generated: null, lastSavedPaths: [] }));
    try {
      const { assets, error } = await buildPrintRequestExportAssets(user, printRequest, items);
      if (error) {
        isBusyRef.current = false;
        setState((current) => ({ ...current, isGenerating: false, error }));
        return;
      }

      const imageRequests: GangSheetExportImageRequest[] = assets.map((asset) => ({
        // The legacy IPC shape requires an allocationId; requestItemId is authoritative for this route.
        allocationId: "request-scoped",
        requestItemId: asset.requestItemId,
        downloadUrl: asset.downloadUrl,
        productionStoragePath: asset.productionStoragePath,
        targetWidthPx: asset.targetWidthPx,
        targetHeightPx: asset.targetHeightPx,
        fileName: asset.fileName,
        quantity: asset.quantity,
        printWidthInches: asset.printWidthInches,
        printHeightInches: asset.printHeightInches,
        grouping: asset.grouping,
      }));

      const cacheScope = buildPrintRequestGangSheetCacheScope(printRequest.id);
      const ipcResult = await window.freshPrints.export.generateGangSheetPng({
        showId: cacheScope,
        cacheScope,
        baseFileName: buildPrintRequestGangSheetBaseFileName(printRequest.name),
        sheetLabel: printRequest.name,
        sheetWidthInches: settings.sheetWidthInches,
        sideMarginInches: settings.sideMarginInches,
        topBottomMarginInches: settings.topBottomMarginInches,
        gutterInches: settings.gutterInches,
        maxSheetLengthInches: settings.maxSheetLengthInches,
        labelFontSizePx: settings.labelFontSizePx,
        sectionPricing: settings.sectionPricing,
        images: imageRequests,
      });
      isBusyRef.current = false;
      if (!ipcResult.success) {
        setState((current) => ({ ...current, isGenerating: false, error: ipcResult.error.message }));
        return;
      }
      setState({ isGenerating: false, isExporting: false, error: null, progress: null, generated: ipcResult.data, lastSavedPaths: [] });
    } catch (error) {
      isBusyRef.current = false;
      setState((current) => ({ ...current, isGenerating: false, error: formatError(error, "Unable to generate this print request's gang sheet.") }));
    }
  }, [user]);

  const exportCached = useCallback(async () => {
    if (!state.generated) return;
    isBusyRef.current = true;
    setState((current) => ({ ...current, isExporting: true, error: null, lastSavedPaths: [] }));
    try {
      const result = await window.freshPrints.export.exportCachedGangSheets({ showId: state.generated.showId, fingerprint: state.generated.fingerprint });
      isBusyRef.current = false;
      if (!result.success) {
        setState((current) => ({ ...current, isExporting: false, error: result.error.message }));
        return;
      }
      setState((current) => ({ ...current, isExporting: false, lastSavedPaths: result.data.canceled ? [] : result.data.savedFilePaths }));
    } catch (error) {
      isBusyRef.current = false;
      setState((current) => ({ ...current, isExporting: false, error: formatError(error, "Unable to export cached gang sheets.") }));
    }
  }, [state.generated]);

  const downloadSheet = useCallback(async (sheetIndex: number) => {
    if (!state.generated) return;
    const result = await window.freshPrints.export.downloadCachedGangSheet({ showId: state.generated.showId, fingerprint: state.generated.fingerprint, sheetIndex });
    if (!result.success) setState((current) => ({ ...current, error: result.error.message }));
  }, [state.generated]);

  const reset = useCallback(() => {
    isBusyRef.current = false;
    setState({ isGenerating: false, isExporting: false, error: null, progress: null, generated: null, lastSavedPaths: [] });
  }, []);

  return {
    ...state,
    sheets: state.generated?.sheets ?? ([] as CachedGangSheetSheetMeta[]),
    warnings: state.generated?.warnings ?? ([] as ShowExportImageWarning[]),
    generate,
    exportCached,
    downloadSheet,
    reset,
  };
}
