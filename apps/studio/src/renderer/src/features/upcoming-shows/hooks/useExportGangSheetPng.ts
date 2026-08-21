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
import { resolveQueuedPrintInches } from "@fresh-prints/shared/utils/printRequestQueuedInches";
import type {
  CachedGangSheetSheetMeta,
  ExportGangSheetPngRequest,
  GenerateGangSheetPngRequest,
  GenerateGangSheetPngResult,
  GangSheetExportImageRequest,
  GangSheetExportProgressEvent,
} from "@fresh-prints/shared/types/export/gangSheetExportIpc.types";
import type { ShowExportImageWarning } from "@fresh-prints/shared/types/export/showExportIpc.types";

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
    const isUpload =
      allocation.sourceType === "customer_upload" || Boolean(allocation.customerUploadId);

    if (isUpload && allocation.customerUploadId) {
      let upload;
      try {
        const { customerUploadReadService } = await import(
          "../../customer-uploads/services/customerUploadReadService"
        );
        upload = await customerUploadReadService.getUploadById(user, allocation.customerUploadId);
      } catch {
        upload = null;
      }

      if (!upload?.productionStoragePath) {
        continue;
      }

      const downloadUrl = await designDerivativeUrlService.getDownloadUrlForCatalogPath(
        upload.productionStoragePath,
      );
      if (!downloadUrl) {
        continue;
      }

      const { printWidthInches, printHeightInches } = resolveQueuedPrintInches({
        allocationWidthInches: allocation.printWidthInches,
        allocationHeightInches: allocation.printHeightInches,
      });

      const { targetWidthPx, targetHeightPx } = computeExportTargetPixelSize(
        printWidthInches,
        printHeightInches,
        upload.widthPx ?? 0,
        upload.heightPx ?? 0,
      );

      imageRequests.push({
        allocationId: allocation.id,
        downloadUrl,
        targetWidthPx,
        targetHeightPx,
        fileName: upload.originalFilename ?? allocation.designTitleSnapshot ?? "upload",
        quantity: allocation.allocatedQuantity,
      });
      continue;
    }

    let design;

    try {
      if (!allocation.designId) {
        continue;
      }
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

    const { printWidthInches, printHeightInches } = resolveQueuedPrintInches({
      allocationWidthInches: allocation.printWidthInches,
      allocationHeightInches: allocation.printHeightInches,
    });

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
  const refreshRequestIdRef = useRef(0);

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

      refreshRequestIdRef.current += 1;
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

        try {
          await upcomingShowService.recordGangSheetGenerated(user, show.id);
        } catch (persistError) {
          setState((current) => ({
            ...current,
            error: formatError(
              persistError,
              "Gang sheets generated locally, but the show could not be marked as generated. Try Generate again.",
            ),
          }));
        }
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
    refreshRequestIdRef.current += 1;
    try {
      await window.freshPrints.export.clearGangSheetCache({ showId });
    } catch {
      // Best-effort cleanup when leaving a show or marking past.
    }
    setState(initialState);
  }, []);

  const applyCacheStatus = useCallback(
    (showId: string, fingerprint: string, status: {
      sheets: CachedGangSheetSheetMeta[];
      placedImageCount: number;
      skippedImageCount: number;
      totalByteSize: number;
      warnings: ShowExportImageWarning[];
    }) => {
      setState({
        isGenerating: false,
        isExporting: false,
        error: null,
        progress: null,
        generated: {
          showId,
          fingerprint,
          sheets: status.sheets,
          placedImageCount: status.placedImageCount,
          skippedImageCount: status.skippedImageCount,
          totalByteSize: status.totalByteSize,
          warnings: status.warnings,
        },
        lastSavedPaths: [],
      });
    },
    [],
  );

  const refreshCacheStatus = useCallback(
    async (show: UpcomingShow, layoutSettings: GangSheetLayoutSettings) => {
      if (!user || !permissionService.canManageUpcomingShows(user)) {
        return;
      }

      const refreshId = ++refreshRequestIdRef.current;

      // Drop another show's cache from the button immediately to avoid a stale Export label.
      setState((current) => {
        if (current.generated?.showId === show.id || current.isGenerating || current.isExporting) {
          return current;
        }
        return initialState;
      });

      try {
        // Fast disk peek — no Firestore allocation/design fetch — so Export shows without a Generate flash.
        const peekResult = await window.freshPrints.export.getGangSheetCacheStatus({
          showId: show.id,
        });

        if (refreshId !== refreshRequestIdRef.current) {
          return;
        }

        if (peekResult.success && peekResult.data.ready && peekResult.data.fingerprint) {
          applyCacheStatus(show.id, peekResult.data.fingerprint, peekResult.data);
        } else {
          setState((current) =>
            current.generated?.showId === show.id && !current.isGenerating ? initialState : current,
          );
        }

        // Confirm the peeked cache still matches current allocations + layout settings.
        const { imageRequests, error } = await buildImageRequests(user, show);
        if (refreshId !== refreshRequestIdRef.current) {
          return;
        }

        if (error || imageRequests.length === 0) {
          setState(initialState);
          return;
        }

        const layoutRequest = buildLayoutRequest(show, layoutSettings, imageRequests);
        const fingerprint = buildGangSheetCacheFingerprint(layoutRequest);

        if (peekResult.success && peekResult.data.ready && peekResult.data.fingerprint === fingerprint) {
          // Peek already applied the correct cache.
          return;
        }

        const statusResult = await window.freshPrints.export.getGangSheetCacheStatus({
          showId: show.id,
          fingerprint,
        });

        if (refreshId !== refreshRequestIdRef.current) {
          return;
        }

        if (!statusResult.success || !statusResult.data.ready || !statusResult.data.fingerprint) {
          setState(initialState);
          return;
        }

        applyCacheStatus(show.id, statusResult.data.fingerprint, statusResult.data);
      } catch {
        if (refreshId === refreshRequestIdRef.current) {
          setState(initialState);
        }
      }
    },
    [applyCacheStatus, user],
  );

  const reset = useCallback(() => {
    refreshRequestIdRef.current += 1;
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
