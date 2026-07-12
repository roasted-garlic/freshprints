import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { upcomingShowService } from "../../upcoming-shows/services/upcomingShowService";
import { designService } from "../../designs/services/designService";
import { designDerivativeUrlService } from "../../designs/services/designDerivativeUrlService";
import {
  customerUploadReadService,
  type StudioCustomerUploadSummary,
} from "../../customer-uploads/services/customerUploadReadService";
import type { ShowAllocation } from "@fresh-prints/shared/types/showAllocation/showAllocation.types";
import type { Design } from "../../designs/types/design.types";

export interface GangSheetShowAsset {
  allocation: ShowAllocation;
  design: Design | null;
  upload: StudioCustomerUploadSummary | null;
  thumbnailUrl: string | null;
}

interface GangSheetShowAssetsState {
  assets: GangSheetShowAsset[];
  error: string | null;
  isLoading: boolean;
}

const initialState: GangSheetShowAssetsState = {
  assets: [],
  error: null,
  isLoading: true,
};

function isUploadAllocation(allocation: ShowAllocation): boolean {
  return (
    allocation.sourceType === "customer_upload" || Boolean(allocation.customerUploadId)
  );
}

/**
 * Loads a show's active allocations joined with catalog design or customer-upload assets.
 */
export function useGangSheetShowAssets(upcomingShowId: string | null) {
  const { user } = useAuth();
  const [state, setState] = useState<GangSheetShowAssetsState>(initialState);

  useEffect(() => {
    let isCancelled = false;

    async function load() {
      if (!user || !permissionService.canViewUpcomingShows(user) || !upcomingShowId) {
        setState({ assets: [], error: null, isLoading: false });
        return;
      }

      setState((current) => ({ ...current, isLoading: true, error: null }));

      try {
        const allocations = await upcomingShowService.listShowAllocations(user, upcomingShowId);
        const activeAllocations = allocations.filter((allocation) => allocation.status !== "canceled");

        const assets = await Promise.all(
          activeAllocations.map(async (allocation): Promise<GangSheetShowAsset> => {
            if (isUploadAllocation(allocation) && allocation.customerUploadId) {
              let upload: StudioCustomerUploadSummary | null = null;
              try {
                upload = await customerUploadReadService.getUploadById(user, allocation.customerUploadId);
              } catch {
                upload = null;
              }

              const thumbnailPath = upload?.thumbnailStoragePath ?? upload?.previewStoragePath ?? undefined;
              const thumbnailUrl = thumbnailPath
                ? await designDerivativeUrlService.getDownloadUrlForCatalogPath(thumbnailPath)
                : null;

              return { allocation, design: null, upload, thumbnailUrl };
            }

            let design: Design | null = null;
            try {
              if (allocation.designId) {
                design = await designService.getDesignById(user, allocation.designId);
              }
            } catch {
              design = null;
            }

            const thumbnailUrl = design ? await designDerivativeUrlService.getThumbnailUrl(design) : null;
            return { allocation, design, upload: null, thumbnailUrl };
          }),
        );

        if (!isCancelled) {
          setState({ assets, error: null, isLoading: false });
        }
      } catch (error) {
        if (!isCancelled) {
          setState({
            assets: [],
            error: error instanceof Error ? error.message : "Unable to load the show's allocated assets.",
            isLoading: false,
          });
        }
      }
    }

    void load();

    return () => {
      isCancelled = true;
    };
  }, [upcomingShowId, user]);

  const assets = useMemo(() => state.assets, [state.assets]);

  return {
    assets,
    error: state.error,
    isLoading: state.isLoading,
  };
}
