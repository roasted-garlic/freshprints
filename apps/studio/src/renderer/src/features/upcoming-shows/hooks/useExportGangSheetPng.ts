import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { upcomingShowService } from "../services/upcomingShowService";
import { designService } from "../../designs/services/designService";
import { designDerivativeUrlService } from "../../designs/services/designDerivativeUrlService";
import { buildGangSheetCacheFingerprint } from "@fresh-prints/shared/utils/gangSheetCacheFingerprint";
import {
  buildGangSheetBaseFileName,
  computeExportTargetPixelSize,
} from "@fresh-prints/shared/utils/showExportFilename";
import type { User } from "../../users/types/user.types";
import type { UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";
import type {
  CachedGangSheetSheetMeta,
  ExportGangSheetPngRequest,
  GenerateGangSheetPngRequest,
  GenerateGangSheetPngResult,
  GangSheetExportImageRequest,
  GangSheetExportProgressEvent,
} from "@fresh-prints/shared/types/export/gangSheetExportIpc.types";
import type { ShowExportImageWarning } from "@fresh-prints/shared/types/export/showExportIpc.types";

const DEFAULT_EXPORT_WIDTH_INCHES = 3;

export interface GangSheetLayoutSettings {
  sheetWidthInches: number;
  sideMarginInches: number;
  topBottomMarginInches: number;
  gutterInches: number;
  maxSheetLengthInches: number;
  labelFontSizePx: number;
}

interface GangSheetGenerateState {
  isGenerating: boolean;
  isExporting: boolean;
  error: string | null;
  progress: GangSheetExportProgressEvent | null;
  generated: GenerateGangSheetPngResult | null;
  lastSavedPaths: string[];
}

const initialState: GangSheetGenerateState = {
  isGenerating: false,
  isExporting: false,
  error: null,
  progress: null,
  generated: null,
  lastSavedPaths: [],
};

function formatError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

async function buildImageRequests(
  user: User,
  show: UpcomingShow,
): Promise<{ imageRequests: GangSheetExportImageRequest[]; error: string | null }> {
  const allocations = await upcomingShowService.listShowAllocations(user, show.id);
  const activeAllocations = allocations.filter((allocation) => allocation.status !== "canceled");

  if (activeAllocations.length === 0) {
    return { imageRequests: [], error: "This show has no active allocations to export." };
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
    return { imageRequests: [], error: "No exportable images were found for this show's allocations." };
  }

  return { imageRequests, error: null };
}

function buildLayoutRequest(
  show: UpcomingShow,
  layoutSettings: GangSheetLayoutSettings,
  imageRequests: GangSheetExportImageRequest[],
): ExportGangSheetPngRequest {
  const scheduledStartAt = show.scheduledStartAt?.toDate() ?? new Date();
  return {
    baseFileName: buildGangSheetBaseFileName(scheduledStartAt),
    sheetWidthInches: layoutSettings.sheetWidthInches,
    sideMarginInches: layoutSettings.sideMarginInches,
    topBottomMarginInches: layoutSettings.topBottomMarginInches,
    gutterInches: layoutSettings.gutterInches,
    maxSheetLengthInches: layoutSettings.maxSheetLengthInches,
    labelFontSizePx: layoutSettings.labelFontSizePx,
    images: imageRequests,
  };
}

export function useExportGangSheetPng() {
  const { user } = useAuth();
  const [state, setState] = useState<GangSheetGenerateState>(initialState);
  const isBusyRef = useRef(false);

  useEffect(() => {
    return window.freshPrints.export.onGangSheetExportProgress((event) => {
      if (!isBusyRef.current) {
        return;
      }

      setState((current) => ({ ...current, progress: event }));
    });
  }, []);

  const generateGangSheet = useCallback(
    async (show: UpcomingShow, layoutSettings: GangSheetLayoutSettings) => {
      if (!user || !permissionService.canManageUpcomingShows(user)) {
        return;
      }

      isBusyRef.current = true;
      setState({
        isGenerating: true,
        isExporting: false,
        error: null,
        progress: null,
        generated: null,
        lastSavedPaths: [],
      });

      try {
        const { imageRequests, error } = await buildImageRequests(user, show);
        if (error) {
          isBusyRef.current = false;
          setState({ ...initialState, error });
          return;
        }

        const layoutRequest = buildLayoutRequest(show, layoutSettings, imageRequests);
        const request: GenerateGangSheetPngRequest = {
          ...layoutRequest,
          showId: show.id,
        };

        const ipcResult = await window.freshPrints.export.generateGangSheetPng(request);
        isBusyRef.current = false;

        if (!ipcResult.success) {
          setState((current) => ({
            ...current,
            isGenerating: false,
            error: ipcResult.error.message,
            generated: null,
          }));
          return;
        }

        setState({
          isGenerating: false,
          isExporting: false,
          error: null,
          progress: null,
          generated: ipcResult.data,
          lastSavedPaths: [],
        });
      } catch (error) {
        isBusyRef.current = false;
        setState({
          ...initialState,
          error: formatError(error, "Unable to generate this show's gang sheets."),
        });
      }
    },
    [user],
  );

  const exportCachedGangSheets = useCallback(async () => {
    if (!state.generated) {
      return;
    }

    isBusyRef.current = true;
    setState((current) => ({ ...current, isExporting: true, error: null, lastSavedPaths: [] }));

    try {
      const ipcResult = await window.freshPrints.export.exportCachedGangSheets({
        showId: state.generated.showId,
        fingerprint: state.generated.fingerprint,
      });
      isBusyRef.current = false;

      if (!ipcResult.success) {
        setState((current) => ({ ...current, isExporting: false, error: ipcResult.error.message }));
        return;
      }

      setState((current) => ({
        ...current,
        isExporting: false,
        lastSavedPaths: ipcResult.data.canceled ? [] : ipcResult.data.savedFilePaths,
      }));
    } catch (error) {
      isBusyRef.current = false;
      setState((current) => ({
        ...current,
        isExporting: false,
        error: formatError(error, "Unable to export cached gang sheets."),
      }));
    }
  }, [state.generated]);

  const downloadCachedSheet = useCallback(
    async (sheetIndex: number) => {
      if (!state.generated) {
        return;
      }

      try {
        const ipcResult = await window.freshPrints.export.downloadCachedGangSheet({
          showId: state.generated.showId,
          fingerprint: state.generated.fingerprint,
          sheetIndex,
        });

        if (!ipcResult.success) {
          setState((current) => ({ ...current, error: ipcResult.error.message }));
        }
      } catch (error) {
        setState((current) => ({
          ...current,
          error: formatError(error, "Unable to download that gang sheet."),
        }));
      }
    },
    [state.generated],
  );

  const clearCacheForShow = useCallback(async (showId: string) => {
    try {
      await window.freshPrints.export.clearGangSheetCache({ showId });
    } catch {
      // Best-effort cleanup when leaving a show or marking past.
    }
    setState(initialState);
  }, []);

  const refreshCacheStatus = useCallback(
    async (show: UpcomingShow, layoutSettings: GangSheetLayoutSettings) => {
      if (!user || !permissionService.canManageUpcomingShows(user)) {
        return;
      }

      try {
        const { imageRequests, error } = await buildImageRequests(user, show);
        if (error || imageRequests.length === 0) {
          setState(initialState);
          return;
        }

        const layoutRequest = buildLayoutRequest(show, layoutSettings, imageRequests);
        const fingerprint = buildGangSheetCacheFingerprint(layoutRequest);
        const statusResult = await window.freshPrints.export.getGangSheetCacheStatus({
          showId: show.id,
          fingerprint,
        });

        if (!statusResult.success || !statusResult.data.ready) {
          setState(initialState);
          return;
        }

        setState({
          isGenerating: false,
          isExporting: false,
          error: null,
          progress: null,
          generated: {
            showId: show.id,
            fingerprint,
            sheets: statusResult.data.sheets,
            placedImageCount: statusResult.data.placedImageCount,
            skippedImageCount: statusResult.data.skippedImageCount,
            totalByteSize: statusResult.data.totalByteSize,
            warnings: statusResult.data.warnings,
          },
          lastSavedPaths: [],
        });
      } catch {
        setState(initialState);
      }
    },
    [user],
  );

  const reset = useCallback(() => {
    isBusyRef.current = false;
    setState(initialState);
  }, []);

  return {
    isGenerating: state.isGenerating,
    isExporting: state.isExporting,
    isBusy: state.isGenerating || state.isExporting,
    error: state.error,
    progress: state.progress,
    generated: state.generated,
    sheets: state.generated?.sheets ?? ([] as CachedGangSheetSheetMeta[]),
    warnings: state.generated?.warnings ?? ([] as ShowExportImageWarning[]),
    lastSavedPaths: state.lastSavedPaths,
    hasGeneratedCache: Boolean(state.generated),
    generateGangSheet,
    exportCachedGangSheets,
    downloadCachedSheet,
    clearCacheForShow,
    refreshCacheStatus,
    reset,
  };
}
