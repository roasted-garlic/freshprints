import { useEffect, useMemo, useRef, useState } from "react";

import type { GangSheetSectionPricingConfig } from "@fresh-prints/shared/constants/gangSheetSectionPricingSettings.constants";
import type { ShowAllocation } from "@fresh-prints/shared/types/showAllocation/showAllocation.types";
import type { UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";

import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { upcomingShowService } from "../services/upcomingShowService";
import {
  calculateShowAllocationGroupPriceUsd,
  sumShowAllocationGroupPricesUsd,
} from "../utils/showAllocationDollarTotals";

export function calculateShowAllocationsTotalPriceUsd(
  allocations: ShowAllocation[],
  sectionPricing: GangSheetSectionPricingConfig,
): number {
  const active = allocations.filter((allocation) => allocation.status !== "canceled");
  const pricesByRequest = new Map<string, number | null>();
  for (const allocation of active) {
    if (pricesByRequest.has(allocation.printRequestId)) {
      continue;
    }
    pricesByRequest.set(
      allocation.printRequestId,
      calculateShowAllocationGroupPriceUsd(
        active.filter((row) => row.printRequestId === allocation.printRequestId),
        sectionPricing,
      ),
    );
  }
  return sumShowAllocationGroupPricesUsd([...pricesByRequest.values()]);
}

/**
 * Dollar totals for Show Queue / Internal Sheet rail cards.
 * Loads allocations only for currently visible show IDs (one-shot parallel fetch).
 * Prefer `selectedShowLiveTotalUsd` when provided so the selected card stays in sync with the live subscription.
 */
export function useShowRailDollarTotals(input: {
  shows: UpcomingShow[];
  sectionPricing: GangSheetSectionPricingConfig;
  selectedShowId: string | null;
  selectedShowLiveTotalUsd: number | null;
}): Record<string, number> {
  const { user } = useAuth();
  const [totalsByShowId, setTotalsByShowId] = useState<Record<string, number>>({});
  const requestIdRef = useRef(0);

  const showIdsKey = useMemo(
    () =>
      input.shows
        .map((show) => show.id)
        .sort()
        .join("|"),
    [input.shows],
  );

  useEffect(() => {
    if (!user || !permissionService.canViewUpcomingShows(user) || input.shows.length === 0) {
      setTotalsByShowId({});
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    let cancelled = false;
    const showIds = input.shows.map((show) => show.id);

    void (async () => {
      const entries = await Promise.all(
        showIds.map(async (showId) => {
          try {
            const allocations = await upcomingShowService.listShowAllocations(user, showId);
            return [showId, calculateShowAllocationsTotalPriceUsd(allocations, input.sectionPricing)] as const;
          } catch {
            return [showId, 0] as const;
          }
        }),
      );

      if (cancelled || requestId !== requestIdRef.current) {
        return;
      }

      setTotalsByShowId(Object.fromEntries(entries));
    })();

    return () => {
      cancelled = true;
    };
  }, [input.sectionPricing, showIdsKey, user]);

  return useMemo(() => {
    if (
      input.selectedShowId &&
      typeof input.selectedShowLiveTotalUsd === "number"
    ) {
      return {
        ...totalsByShowId,
        [input.selectedShowId]: input.selectedShowLiveTotalUsd,
      };
    }
    return totalsByShowId;
  }, [input.selectedShowId, input.selectedShowLiveTotalUsd, totalsByShowId]);
}
