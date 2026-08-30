import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { upcomingShowService } from "../services/upcomingShowService";
import { designService } from "../../designs/services/designService";
import { designDerivativeUrlService } from "../../designs/services/designDerivativeUrlService";
import { buildGangSheetCacheFingerprint } from "@fresh-prints/shared/utils/gangSheetCacheFingerprint";
import { planEfficiencyGangSheetLayout } from "@fresh-prints/shared/utils/gangSheetEfficiencyLayout";
import { planContinuousCustomerGroupedGangSheetLayout } from "@fresh-prints/shared/utils/gangSheetContinuousCustomerGroupedLayout";
import { planSheetPerCustomerGangSheetLayout } from "@fresh-prints/shared/utils/gangSheetGroupedLayout";
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
  GangSheetLayoutMode,
  GenerateGangSheetPngRequest,
  GenerateGangSheetPngResult,
  GangSheetExportImageRequest,
  GangSheetExportProgressEvent,
} from "@fresh-prints/shared/types/export/gangSheetExportIpc.types";
import type { ShowExportImageWarning } from "@fresh-prints/shared/types/export/showExportIpc.types";
import { printRequestService } from "../../print-requests/services/printRequestService";
import type { PrintRequest } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import {
  filterShowExportAllocations,
  shouldUseHistoricalShowExportAllocations,
} from "../utils/showExportEligibility";

const GANG_SHEET_EXPORT_DPI = 300;

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
  cachedLayoutMode: GangSheetLayoutMode | null;
  lastSavedPaths: string[];
}

const initialState: GangSheetGenerateState = {
  isGenerating: false,
  isExporting: false,
  error: null,
  progress: null,
  generated: null,
  cachedLayoutMode: null,
  lastSavedPaths: [],
};

function formatError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function resolveLayoutModeForFingerprint(
  show: UpcomingShow,
  layoutSettings: GangSheetLayoutSettings,
  imageRequests: GangSheetExportImageRequest[],
  fingerprint: string,
): GangSheetLayoutMode | null {
  for (const mode of ["efficiency", "grouped_by_customer", "customer_grouped_continuous"] as const) {
    const layoutRequest = buildLayoutRequest(show, layoutSettings, imageRequests, mode);
    if (buildGangSheetCacheFingerprint(layoutRequest) === fingerprint) {
      return mode;
    }
  }

  return null;
}

function buildGroupingMetadata(
  allocation: { printRequestId: string; requestNameSnapshot?: string },
  printRequest: PrintRequest | null,
) {
  if (!printRequest) {
    return {
      printRequestId: allocation.printRequestId,
      requestName: allocation.requestNameSnapshot ?? allocation.printRequestId,
      isInternal: false,
    };
  }

  return {
    printRequestId: printRequest.id,
    requestName: printRequest.name,
    customerId: printRequest.customerId,
    customerUsernameSnapshot: printRequest.customerUsernameSnapshot,
    internalBaseName: printRequest.internalBaseName,
    isInternal: printRequest.isInternal,
  };
}

export interface GangSheetSheetCountPreview {
  efficiencySheets: number;
  /** Sheet per Customer (`grouped_by_customer`). */
  groupedSheets: number;
  /** Grouped by Customer continuous (`customer_grouped_continuous`). */
  continuousGroupedSheets: number;
}

function estimateSheetCountsFromRequests(
  imageRequests: GangSheetExportImageRequest[],
  layoutSettings: GangSheetLayoutSettings,
): GangSheetSheetCountPreview {
  const sheetWidthPx = Math.round(layoutSettings.sheetWidthInches * GANG_SHEET_EXPORT_DPI);
  const spacingPx = {
    sideMarginPx: Math.round(layoutSettings.sideMarginInches * GANG_SHEET_EXPORT_DPI),
    topBottomMarginPx: Math.round(layoutSettings.topBottomMarginInches * GANG_SHEET_EXPORT_DPI),
    gutterPx: Math.round(layoutSettings.gutterInches * GANG_SHEET_EXPORT_DPI),
  };
  const maxSheetHeightPx = Math.round(layoutSettings.maxSheetLengthInches * GANG_SHEET_EXPORT_DPI);

  const efficiency = planEfficiencyGangSheetLayout({
    images: imageRequests.map((image) => ({
      allocationId: image.allocationId,
      quantity: image.quantity,
      widthPx: image.targetWidthPx,
      heightPx: image.targetHeightPx,
    })),
    sheetWidthPx,
    spacingPx,
    maxSheetHeightPx,
  });

  const groupedImages = imageRequests
    .filter((image) => image.grouping)
    .map((image) => ({
      allocationId: image.allocationId,
      printRequestId: image.grouping!.printRequestId,
      requestName: image.grouping!.requestName,
      customerId: image.grouping!.customerId,
      customerUsernameSnapshot: image.grouping!.customerUsernameSnapshot,
      internalBaseName: image.grouping!.internalBaseName,
      isInternal: image.grouping!.isInternal,
      quantity: image.quantity,
      widthPx: image.targetWidthPx,
      heightPx: image.targetHeightPx,
    }));

  const grouped = planSheetPerCustomerGangSheetLayout({
    images: groupedImages,
    sheetWidthPx,
    spacingPx,
    maxSheetHeightPx,
    sheetLabelFontSizePx: layoutSettings.labelFontSizePx,
  });

  const continuousGrouped = planContinuousCustomerGroupedGangSheetLayout({
    images: groupedImages,
    sheetWidthPx,
    spacingPx,
    maxSheetHeightPx,
    sheetLabelFontSizePx: layoutSettings.labelFontSizePx,
  });

  return {
    efficiencySheets: efficiency.sheetCount,
    groupedSheets: grouped.sheetCount,
    continuousGroupedSheets: continuousGrouped.sheetCount,
  };
}

async function applyGangSheetCacheFromImageRequests(input: {
  show: UpcomingShow;
  layoutSettings: GangSheetLayoutSettings;
  imageRequests: GangSheetExportImageRequest[];
  preferredLayoutMode?: GangSheetLayoutMode;
  /** When false with preferredLayoutMode, do not apply the other layout's cache under the wrong tab. */
  allowFallbackToOtherMode?: boolean;
  onApply: (
    showId: string,
    fingerprint: string,
    layoutMode: GangSheetLayoutMode,
    status: {
      sheets: CachedGangSheetSheetMeta[];
      placedImageCount: number;
      skippedImageCount: number;
      totalByteSize: number;
      warnings: ShowExportImageWarning[];
    },
  ) => void;
  onMissingCache: () => void;
  onStaleCache: () => void;
}): Promise<void> {
  const allLayoutModes: GangSheetLayoutMode[] = [
    "efficiency",
    "grouped_by_customer",
    "customer_grouped_continuous",
  ];
  const modesToCheck: GangSheetLayoutMode[] = input.preferredLayoutMode
    ? input.allowFallbackToOtherMode === false
      ? [input.preferredLayoutMode]
      : [
          input.preferredLayoutMode,
          ...allLayoutModes.filter((mode) => mode !== input.preferredLayoutMode),
        ]
    : ["customer_grouped_continuous", "grouped_by_customer", "efficiency"];

  for (const layoutMode of modesToCheck) {
    const fingerprint = buildGangSheetCacheFingerprint(
      buildLayoutRequest(input.show, input.layoutSettings, input.imageRequests, layoutMode),
    );
    const statusResult = await window.freshPrints.export.getGangSheetCacheStatus({
      showId: input.show.id,
      fingerprint,
    });

    if (statusResult.success && statusResult.data.ready && statusResult.data.fingerprint === fingerprint) {
      input.onApply(input.show.id, fingerprint, layoutMode, statusResult.data);
      return;
    }
  }

  // Fall back to a disk peek so leftover folders with unexpected names still surface when possible.
  if (input.allowFallbackToOtherMode === false) {
    input.onMissingCache();
    return;
  }

  const peekResult = await window.freshPrints.export.getGangSheetCacheStatus({
    showId: input.show.id,
  });

  if (!peekResult.success || !peekResult.data.ready || !peekResult.data.fingerprint) {
    input.onMissingCache();
    return;
  }

  const cachedLayoutMode = resolveLayoutModeForFingerprint(
    input.show,
    input.layoutSettings,
    input.imageRequests,
    peekResult.data.fingerprint,
  );

  if (!cachedLayoutMode) {
    input.onStaleCache();
    return;
  }

  input.onApply(input.show.id, peekResult.data.fingerprint, cachedLayoutMode, peekResult.data);
}

async function buildImageRequests(
  user: User,
  show: UpcomingShow,
): Promise<{ imageRequests: GangSheetExportImageRequest[]; error: string | null }> {
  const allocations = await upcomingShowService.listShowAllocations(user, show.id);
  const useHistoricalPastExport = shouldUseHistoricalShowExportAllocations(show);
  const activeAllocations = filterShowExportAllocations(allocations, {
    useHistoricalPastExport,
  });

  if (activeAllocations.length === 0) {
    return {
      imageRequests: [],
      error: useHistoricalPastExport
        ? "This show has no attached print requests to export."
        : "This show has no active allocations to export.",
    };
  }

  const uniqueRequestIds = [...new Set(activeAllocations.map((allocation) => allocation.printRequestId))];
  const printRequestEntries = await Promise.all(
    uniqueRequestIds.map(async (printRequestId) => {
      try {
        const printRequest = await printRequestService.getPrintRequestById(user, printRequestId);
        return [printRequestId, printRequest] as const;
      } catch {
        return [printRequestId, null] as const;
      }
    }),
  );
  const printRequestsById = new Map(
    printRequestEntries.filter((entry): entry is readonly [string, PrintRequest] => entry[1] !== null),
  );

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
        grouping: buildGroupingMetadata(allocation, printRequestsById.get(allocation.printRequestId) ?? null),
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
      grouping: buildGroupingMetadata(allocation, printRequestsById.get(allocation.printRequestId) ?? null),
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
  layoutMode: GangSheetLayoutMode = "efficiency",
): ExportGangSheetPngRequest {
  const scheduledStartAt = show.scheduledStartAt?.toDate() ?? new Date();
  return {
    baseFileName: buildGangSheetBaseFileName(scheduledStartAt, layoutMode),
    sheetWidthInches: layoutSettings.sheetWidthInches,
    sideMarginInches: layoutSettings.sideMarginInches,
    topBottomMarginInches: layoutSettings.topBottomMarginInches,
    gutterInches: layoutSettings.gutterInches,
    maxSheetLengthInches: layoutSettings.maxSheetLengthInches,
    labelFontSizePx: layoutSettings.labelFontSizePx,
    ...(layoutMode !== "efficiency" ? { layoutMode } : {}),
    images: imageRequests,
  };
}

export function useExportGangSheetPng() {
  const { user } = useAuth();
  const [state, setState] = useState<GangSheetGenerateState>(initialState);
  const isBusyRef = useRef(false);
  const refreshRequestIdRef = useRef(0);
  const modalPrepareRequestIdRef = useRef(0);

  useEffect(() => {
    return window.freshPrints.export.onGangSheetExportProgress((event) => {
      if (!isBusyRef.current) {
        return;
      }

      setState((current) => ({ ...current, progress: event }));
    });
  }, []);

  const generateGangSheet = useCallback(
    async (
      show: UpcomingShow,
      layoutSettings: GangSheetLayoutSettings,
      layoutMode: GangSheetLayoutMode = "efficiency",
    ) => {
      if (!user || !permissionService.canManageUpcomingShows(user)) {
        return;
      }

      refreshRequestIdRef.current += 1;
      modalPrepareRequestIdRef.current += 1;
      isBusyRef.current = true;
      setState((current) => ({
        ...current,
        isGenerating: true,
        isExporting: false,
        error: null,
        progress: null,
        generated: null,
        lastSavedPaths: [],
      }));

      try {
        const { imageRequests, error } = await buildImageRequests(user, show);
        if (error) {
          isBusyRef.current = false;
          setState({ ...initialState, error });
          return;
        }

        const layoutRequest = buildLayoutRequest(show, layoutSettings, imageRequests, layoutMode);
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
          cachedLayoutMode: layoutMode,
          lastSavedPaths: [],
        });

        // Telemetry only — never surface as a generation failure after sheets are cached.
        try {
          await upcomingShowService.recordGangSheetGenerated(user, show.id);
        } catch (persistError) {
          console.warn(
            "[useExportGangSheetPng] Gang sheets generated, but show telemetry could not be recorded:",
            persistError,
          );
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
    (
      showId: string,
      fingerprint: string,
      layoutMode: GangSheetLayoutMode,
      status: {
      sheets: CachedGangSheetSheetMeta[];
      placedImageCount: number;
      skippedImageCount: number;
      totalByteSize: number;
      warnings: ShowExportImageWarning[];
    },
    ) => {
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
        cachedLayoutMode: layoutMode,
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
        const { imageRequests, error } = await buildImageRequests(user, show);
        if (refreshId !== refreshRequestIdRef.current) {
          return;
        }

        if (error || imageRequests.length === 0) {
          // Do not clear an in-session generate if a background refresh cannot rebuild image requests.
          return;
        }

        await applyGangSheetCacheFromImageRequests({
          show,
          layoutSettings,
          imageRequests,
          onApply: (showId, fingerprint, layoutMode, status) => {
            if (refreshId !== refreshRequestIdRef.current) {
              return;
            }
            setState((current) => {
              // Do not replace an in-session generate with a different layout mode found on disk
              // (e.g. leftover Standard cache peek winning over a just-finished Grouped generate).
              if (
                current.generated?.showId === showId &&
                current.generated.sheets.length > 0 &&
                current.cachedLayoutMode != null &&
                current.cachedLayoutMode !== layoutMode
              ) {
                return current;
              }

              return {
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
                cachedLayoutMode: layoutMode,
                lastSavedPaths: [],
              };
            });
          },
          onMissingCache: () => {
            // Never wipe in-memory generate results. Disk peek can lag or briefly miss right after
            // a successful generate; clearing here sent users back to the empty Generate screen.
          },
          onStaleCache: () => {
            // Keep local results for this show. A fingerprint mismatch during a background refresh
            // must not discard sheets the user just generated in this session.
          },
        });
      } catch {
        // Background refresh failures must not clear a successful in-session generate.
      }
    },
    [user],
  );

  const prepareGangSheetModal = useCallback(
    async (
      show: UpcomingShow,
      layoutSettings: GangSheetLayoutSettings,
      preferredLayoutMode?: GangSheetLayoutMode,
    ): Promise<{ preview: GangSheetSheetCountPreview | null; error: string | null }> => {
      if (!user || !permissionService.canManageUpcomingShows(user)) {
        return { preview: null, error: null };
      }

      const prepareSessionId = ++modalPrepareRequestIdRef.current;

      const { imageRequests, error } = await buildImageRequests(user, show);
      if (prepareSessionId !== modalPrepareRequestIdRef.current) {
        return { preview: null, error: null };
      }

      if (error) {
        return { preview: null, error };
      }

      if (imageRequests.length === 0) {
        return { preview: null, error: "No exportable images were found for this show's allocations." };
      }

      await applyGangSheetCacheFromImageRequests({
        show,
        layoutSettings,
        imageRequests,
        preferredLayoutMode,
        allowFallbackToOtherMode: false,
        onApply: (showId, fingerprint, layoutMode, status) => {
          if (prepareSessionId !== modalPrepareRequestIdRef.current) {
            return;
          }
          applyCacheStatus(showId, fingerprint, layoutMode, status);
        },
        onMissingCache: () => {
          if (prepareSessionId !== modalPrepareRequestIdRef.current) {
            return;
          }
          setState((current) => ({
            ...current,
            generated: null,
            cachedLayoutMode: null,
            error: null,
            progress: null,
          }));
        },
        onStaleCache: () => {
          if (prepareSessionId !== modalPrepareRequestIdRef.current) {
            return;
          }
          setState((current) => ({
            ...current,
            generated: null,
            cachedLayoutMode: null,
            error: null,
            progress: null,
          }));
        },
      });

      if (prepareSessionId !== modalPrepareRequestIdRef.current) {
        return { preview: null, error: null };
      }

      return {
        preview: estimateSheetCountsFromRequests(imageRequests, layoutSettings),
        error: null,
      };
    },
    [applyCacheStatus, user],
  );

  const hydrateCacheForLayoutMode = useCallback(
    async (
      show: UpcomingShow,
      layoutSettings: GangSheetLayoutSettings,
      layoutMode: GangSheetLayoutMode,
    ): Promise<void> => {
      if (!user || !permissionService.canManageUpcomingShows(user)) {
        return;
      }

      if (state.cachedLayoutMode === layoutMode && state.generated?.sheets.length) {
        return;
      }

      const hydrateId = ++modalPrepareRequestIdRef.current;
      const { imageRequests, error } = await buildImageRequests(user, show);
      if (hydrateId !== modalPrepareRequestIdRef.current || error || imageRequests.length === 0) {
        return;
      }

      await applyGangSheetCacheFromImageRequests({
        show,
        layoutSettings,
        imageRequests,
        preferredLayoutMode: layoutMode,
        allowFallbackToOtherMode: false,
        onApply: (showId, fingerprint, appliedMode, status) => {
          if (hydrateId !== modalPrepareRequestIdRef.current) {
            return;
          }
          applyCacheStatus(showId, fingerprint, appliedMode, status);
        },
        onMissingCache: () => {
          if (hydrateId !== modalPrepareRequestIdRef.current) {
            return;
          }
          setState((current) => ({
            ...current,
            generated: null,
            cachedLayoutMode: null,
            error: null,
            progress: null,
          }));
        },
        onStaleCache: () => {
          if (hydrateId !== modalPrepareRequestIdRef.current) {
            return;
          }
          setState((current) => ({
            ...current,
            generated: null,
            cachedLayoutMode: null,
            error: null,
            progress: null,
          }));
        },
      });
    },
    [applyCacheStatus, state.cachedLayoutMode, state.generated?.sheets.length, user],
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
    cachedLayoutMode: state.cachedLayoutMode,
    sheets: state.generated?.sheets ?? ([] as CachedGangSheetSheetMeta[]),
    warnings: state.generated?.warnings ?? ([] as ShowExportImageWarning[]),
    lastSavedPaths: state.lastSavedPaths,
    hasGeneratedCache: Boolean(state.generated),
    hasGeneratedCacheForMode: (layoutMode: GangSheetLayoutMode) =>
      Boolean(state.generated?.sheets.length) && state.cachedLayoutMode === layoutMode,
    generateGangSheet,
    prepareGangSheetModal,
    hydrateCacheForLayoutMode,
    exportCachedGangSheets,
    downloadCachedSheet,
    clearCacheForShow,
    refreshCacheStatus,
    reset,
  };
}
