import { useEffect, useRef, useState } from "react";

import type { UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";
import { isStalePastPrintingWhatnotShow } from "@fresh-prints/shared/utils/showScheduleGrouping";

import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { upcomingShowService } from "../services/upcomingShowService";

export function useStalePastPrintingShowReconciliation(shows: UpcomingShow[], now: Date) {
  const { user } = useAuth();
  const inFlightRef = useRef(new Set<string>());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !permissionService.canManageUpcomingShows(user)) {
      return;
    }

    const staleShows = shows.filter((show) => isStalePastPrintingWhatnotShow(show, now));
    if (staleShows.length === 0) {
      return;
    }

    let cancelled = false;

    void (async () => {
      for (const show of staleShows) {
        if (cancelled || inFlightRef.current.has(show.id)) {
          continue;
        }
        inFlightRef.current.add(show.id);
        try {
          await upcomingShowService.markShowPrintingFinished(user, show.id);
          if (!cancelled) {
            setError(null);
          }
        } catch (caught) {
          if (!cancelled) {
            setError(
              caught instanceof Error
                ? caught.message
                : "Unable to complete a past Printing show automatically.",
            );
          }
        } finally {
          inFlightRef.current.delete(show.id);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [now, shows, user]);

  return { error };
}
