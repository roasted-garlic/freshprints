import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import {
  buildExportImageFilename,
  buildExportZipFilename,
} from "@fresh-prints/shared/utils/showExportFilename";
import type { UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";
import type {
  ExportShowZipRequest,
  ExportShowZipResult,
  ShowExportImageRequest,
  ShowExportProgressEvent,
} from "@fresh-prints/shared/types/export/showExportIpc.types";
import { buildShowExportAllocationAssets } from "../utils/buildShowExportAllocationAssets";

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
        const { assets, error: buildError } = await buildShowExportAllocationAssets(user, show);
        if (buildError) {
          isExportingRef.current = false;
          setState({
            isExporting: false,
            error: buildError,
            result: null,
            progress: null,
          });
          return;
        }

        const imageRequests: ShowExportImageRequest[] = [];
        let sequenceNumber = 0;

        for (const asset of assets) {
          sequenceNumber += 1;
          imageRequests.push({
            allocationId: asset.allocationId,
            downloadUrl: asset.downloadUrl,
            targetWidthPx: asset.targetWidthPx,
            targetHeightPx: asset.targetHeightPx,
            fileName: buildExportImageFilename({
              sequenceNumber,
              allocatedQuantity: asset.quantity,
              printWidthInches: asset.printWidthInches,
              printHeightInches: asset.printHeightInches,
              designTitle: asset.fileName,
              allocationId: asset.allocationId,
            }),
            quantity: asset.quantity,
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
