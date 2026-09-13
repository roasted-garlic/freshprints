import { useEffect, useRef, useState } from "react";

import type { UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";
import { isEmptyPastShowNeedingAutoClose } from "@fresh-prints/shared/utils/showProductionRecovery";

import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { showProductionRecoveryService } from "../services/showProductionRecoveryService";

export function useEmptyPastShowReconciliation(
  shows: UpcomingShow[],
  now: Date,
  onShowUpdated?: () => void | Promise<void>,
) {
  const { user } = useAuth();
  const inFlightRef = useRef(new Set<string>());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !permissionService.canManageUpcomingShows(user)) {
      return;
    }

    const emptyPastShows = shows.filter((show) => isEmptyPastShowNeedingAutoClose(show, now));
    if (emptyPastShows.length === 0) {
      return;
    }

    let cancelled = false;

    void (async () => {
      for (const show of emptyPastShows) {
        if (cancelled || inFlightRef.current.has(show.id)) {
          continue;
        }
        inFlightRef.current.add(show.id);
        try {
          const result = await showProductionRecoveryService.apply({
            upcomingShowId: show.id,
            action: "close_empty",
          });
          if (result.outcome !== "applied" && result.outcome !== "already_terminal") {
            throw new Error(result.message || "Unable to close empty past show.");
          }
          if (!cancelled) {
            setError(null);
            await onShowUpdated?.();
          }
        } catch (caught) {
          if (!cancelled) {
            setError(
              caught instanceof Error
                ? caught.message
                : "Unable to close an empty past show automatically.",
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
  }, [now, onShowUpdated, shows, user]);

  return { error };
}
