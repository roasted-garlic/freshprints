import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { upcomingShowService } from "../services/upcomingShowService";
import { designService } from "../../designs/services/designService";
import { designDerivativeUrlService } from "../../designs/services/designDerivativeUrlService";
import {
  buildGangSheetBaseFileName,
  computeExportTargetPixelSize,
} from "@fresh-prints/shared/utils/showExportFilename";
import type { UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";
import type {
  ExportGangSheetPngRequest,
  ExportGangSheetPngResult,
  GangSheetExportImageRequest,
  GangSheetExportProgressEvent,
} from "@fresh-prints/shared/types/export/gangSheetExportIpc.types";

const DEFAULT_EXPORT_WIDTH_INCHES = 3;

export interface GangSheetLayoutSettings {
  sheetWidthInches: number;
  sideMarginInches: number;
  topBottomMarginInches: number;
  gutterInches: number;
  maxSheetLengthInches: number;
  labelFontSizePx: number;
}

interface ExportGangSheetPngState {
  isExporting: boolean;
  error: string | null;
  result: ExportGangSheetPngResult | null;
  progress: GangSheetExportProgressEvent | null;
}

const initialState: ExportGangSheetPngState = {
  isExporting: false,
  error: null,
  result: null,
  progress: null,
};

function formatError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useExportGangSheetPng() {
  const { user } = useAuth();
  const [state, setState] = useState<ExportGangSheetPngState>(initialState);
  const isExportingRef = useRef(false);

  useEffect(() => {
    return window.freshPrints.export.onGangSheetExportProgress((event) => {
      if (!isExportingRef.current) {
        return;
      }

      setState((current) => ({ ...current, progress: event }));
    });
  }, []);

  const exportGangSheetPng = useCallback(
    async (show: UpcomingShow, layoutSettings: GangSheetLayoutSettings) => {
      if (!user || !permissionService.canManageUpcomingShows(user)) {
        return;
      }

      isExportingRef.current = true;
      setState({ isExporting: true, error: null, result: null, progress: null });

      try {
        const allocations = await upcomingShowService.listShowAllocations(user, show.id);
        const activeAllocations = allocations.filter((allocation) => allocation.status !== "canceled");

        if (activeAllocations.length === 0) {
          isExportingRef.current = false;
          setState({
            isExporting: false,
            error: "This show has no active allocations to export.",
            result: null,
            progress: null,
          });
          return;
        }

        const imageRequests: GangSheetExportImageRequest[] = [];

        for (const allocation of activeAllocations) {
          let design;

          try {
            design = await designService.getDesignById(user, allocation.designId);
          } catch {
            design = null;
          }

          if (!design) {
            continue;
          }

          const downloadUrl = await designDerivativeUrlService.getDownloadUrlForCatalogPath(design.originalPath);

          if (!downloadUrl) {
            continue;
          }

          const printWidthInches =
            allocation.printWidthInches ?? design.printWidthInches ?? DEFAULT_EXPORT_WIDTH_INCHES;
          const printHeightInches =
            allocation.printHeightInches ??
            design.printHeightInches ??
            (design.width && design.height
              ? printWidthInches * (design.height / design.width)
              : printWidthInches);

          const { targetWidthPx, targetHeightPx } = computeExportTargetPixelSize(
            printWidthInches,
            printHeightInches,
            design.width ?? 0,
            design.height ?? 0,
          );

          imageRequests.push({
            allocationId: allocation.id,
            downloadUrl,
            targetWidthPx,
            targetHeightPx,
            fileName: design.title ?? allocation.designTitleSnapshot ?? "design",
            quantity: allocation.allocatedQuantity,
          });
        }

        if (imageRequests.length === 0) {
          isExportingRef.current = false;
          setState({
            isExporting: false,
            error: "No exportable images were found for this show's allocations.",
            result: null,
            progress: null,
          });
          return;
        }

        const scheduledStartAt = show.scheduledStartAt?.toDate() ?? new Date();
        const request: ExportGangSheetPngRequest = {
          baseFileName: buildGangSheetBaseFileName(scheduledStartAt),
          sheetWidthInches: layoutSettings.sheetWidthInches,
          sideMarginInches: layoutSettings.sideMarginInches,
          topBottomMarginInches: layoutSettings.topBottomMarginInches,
          gutterInches: layoutSettings.gutterInches,
          maxSheetLengthInches: layoutSettings.maxSheetLengthInches,
          labelFontSizePx: layoutSettings.labelFontSizePx,
          images: imageRequests,
        };

        const ipcResult = await window.freshPrints.export.exportGangSheetPng(request);
        isExportingRef.current = false;

        if (!ipcResult.success) {
          setState((current) => ({ ...current, isExporting: false, error: ipcResult.error.message, result: null }));
          return;
        }

        setState((current) => ({ ...current, isExporting: false, error: null, result: ipcResult.data }));
      } catch (error) {
        isExportingRef.current = false;
        setState((current) => ({
          ...current,
          isExporting: false,
          error: formatError(error, "Unable to export this show's gang sheet."),
          result: null,
        }));
      }
    },
    [user],
  );

  const reset = useCallback(() => {
    isExportingRef.current = false;
    setState(initialState);
  }, []);

  return {
    isExporting: state.isExporting,
    error: state.error,
    result: state.result,
    progress: state.progress,
    exportGangSheetPng,
    reset,
  };
}
