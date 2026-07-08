import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { upcomingShowService } from "../../upcoming-shows/services/upcomingShowService";
import { designService } from "../../designs/services/designService";
import { designDerivativeUrlService } from "../../designs/services/designDerivativeUrlService";
import type { ShowAllocation } from "@fresh-prints/shared/types/showAllocation/showAllocation.types";
import type { Design } from "../../designs/types/design.types";

export interface GangSheetShowAsset {
  allocation: ShowAllocation;
  design: Design | null;
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

/**
 * Loads a show's active allocations joined with their approved catalog design (for title,
 * requested size, and a thumbnail preview). Canceled allocations are excluded since they were
 * never meant to be produced. Designs referenced by an allocation may have been archived after
 * allocation; that is not blocked here since the allocation itself already captured the
 * canonical original path snapshot fields needed at placement time.
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
            let design: Design | null = null;

            try {
              design = await designService.getDesignById(user, allocation.designId);
            } catch {
              design = null;
            }

            const thumbnailUrl = design ? await designDerivativeUrlService.getThumbnailUrl(design) : null;

            return { allocation, design, thumbnailUrl };
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

  return useMemo(() => state, [state]);
}
