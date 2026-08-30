import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { upcomingShowService } from "../services/upcomingShowService";
import { designService } from "../../designs/services/designService";
import { designDerivativeUrlService } from "../../designs/services/designDerivativeUrlService";
import {
  buildExportImageFilename,
  buildExportZipFilename,
  computeExportTargetPixelSize,
} from "@fresh-prints/shared/utils/showExportFilename";
import type { UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";
import { resolveQueuedPrintInches } from "@fresh-prints/shared/utils/printRequestQueuedInches";
import type {
  ExportShowZipRequest,
  ExportShowZipResult,
  ShowExportImageRequest,
  ShowExportProgressEvent,
} from "@fresh-prints/shared/types/export/showExportIpc.types";
import {
  filterShowExportAllocations,
  shouldUseHistoricalShowExportAllocations,
} from "../utils/showExportEligibility";

interface ExportShowZipState {
  isExporting: boolean;
  error: string | null;
  result: ExportShowZipResult | null;
  progress: ShowExportProgressEvent | null;
}

const initialState: ExportShowZipState = {
  isExporting: false,
  error: null,
  result: null,
  progress: null,
};

function formatError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useExportShowZip() {
  const { user } = useAuth();
  const [state, setState] = useState<ExportShowZipState>(initialState);
  const isExportingRef = useRef(false);

  useEffect(() => {
    return window.freshPrints.export.onExportProgress((event) => {
      if (!isExportingRef.current) {
        return;
      }

      setState((current) => ({ ...current, progress: event }));
    });
  }, []);

  const exportShowZip = useCallback(
    async (show: UpcomingShow, multiplyByQuantity: boolean) => {
      if (!user || !permissionService.canManageUpcomingShows(user)) {
        return;
      }

      isExportingRef.current = true;
      setState({ isExporting: true, error: null, result: null, progress: null });

      try {
        const allocations = await upcomingShowService.listShowAllocations(user, show.id);
        const useHistoricalPastExport = shouldUseHistoricalShowExportAllocations(show);
        const activeAllocations = filterShowExportAllocations(allocations, {
          useHistoricalPastExport,
        });

        if (activeAllocations.length === 0) {
          isExportingRef.current = false;
          setState({
            isExporting: false,
            error: useHistoricalPastExport
              ? "This show has no attached print requests to export."
              : "This show has no active allocations to export.",
            result: null,
            progress: null,
          });
          return;
        }

        const imageRequests: ShowExportImageRequest[] = [];
        let sequenceNumber = 0;

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

            sequenceNumber += 1;
            imageRequests.push({
              allocationId: allocation.id,
              downloadUrl,
              targetWidthPx,
              targetHeightPx,
              fileName: buildExportImageFilename({
                sequenceNumber,
                allocatedQuantity: allocation.allocatedQuantity,
                printWidthInches,
                printHeightInches,
                designTitle:
                  upload.originalFilename ?? allocation.designTitleSnapshot ?? "upload",
                allocationId: allocation.id,
              }),
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

          sequenceNumber += 1;

          const fileName = buildExportImageFilename({
            sequenceNumber,
            allocatedQuantity: allocation.allocatedQuantity,
            printWidthInches,
            printHeightInches,
            designTitle: design.title ?? allocation.designTitleSnapshot ?? "design",
            allocationId: allocation.id,
          });

          imageRequests.push({
            allocationId: allocation.id,
            downloadUrl,
            targetWidthPx,
            targetHeightPx,
            fileName,
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
        const request: ExportShowZipRequest = {
          zipFileName: buildExportZipFilename(scheduledStartAt),
          images: imageRequests,
          multiplyByQuantity,
        };

        const ipcResult = await window.freshPrints.export.exportShowZip(request);
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
          error: formatError(error, "Unable to export this show's images."),
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
    exportShowZip,
    reset,
  };
}
