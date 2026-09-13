import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { upcomingShowService } from "../services/upcomingShowService";
import type { UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";

interface UpcomingShowsState {
  shows: UpcomingShow[];
  error: string | null;
  isLoading: boolean;
}

const initialState: UpcomingShowsState = {
  shows: [],
  error: null,
  isLoading: true,
};

interface LoadUpcomingShowsOptions {
  silent?: boolean;
}

/**
 * `liveShowId`, when provided, adds a bounded, single-document live subscription for exactly that
 * show (Plan Section 22.4/22.5, Amendment 4, Fix 3 extended) — the currently-selected Show Queue
 * show, so a Portal-submitted allocation's `allocatedQuantity` bump on the show document itself is
 * reflected without a remount, matching `useShowAllocations`'s existing per-show live pattern. The
 * one-shot `listUpcomingShows` list-load remains unchanged; this only patches the single entry in
 * `shows` matching `liveShowId` in place when the subscription emits.
 */
export function useUpcomingShows(liveShowId: string | null = null) {
  const { user } = useAuth();
  const [state, setState] = useState<UpcomingShowsState>(initialState);
  const activeLiveShowIdRef = useRef<string | null>(null);

  const loadUpcomingShows = useCallback(async (options?: LoadUpcomingShowsOptions) => {
    if (!user || !permissionService.canViewUpcomingShows(user)) {
      setState({ shows: [], error: null, isLoading: false });
      return;
    }

    setState((currentState) =>
      options?.silent
        ? { ...currentState, error: null }
        : { ...currentState, error: null, isLoading: true },
    );

    try {
      const shows = await upcomingShowService.listUpcomingShows(user);
      setState({ shows, error: null, isLoading: false });
    } catch (error) {
      setState({
        shows: [],
        error: error instanceof Error ? error.message : "Unable to load upcoming shows.",
        isLoading: false,
      });
    }
  }, [user]);

  useEffect(() => {
    void loadUpcomingShows();
  }, [loadUpcomingShows]);

  useEffect(() => {
    activeLiveShowIdRef.current = liveShowId;

    if (!user || !permissionService.canViewUpcomingShows(user) || !liveShowId) {
      return;
    }

    const unsubscribe = upcomingShowService.subscribeToUpcomingShow(
      user,
      liveShowId,
      (liveShow) => {
        if (activeLiveShowIdRef.current !== liveShowId || !liveShow) {
          return;
        }
        setState((currentState) => ({
          ...currentState,
          shows: currentState.shows.map((show) => (show.id === liveShowId ? liveShow : show)),
        }));
      },
      () => {
        // A live-refresh failure leaves the last-known (one-shot-fetched) show data in place —
        // the show remains visible/usable, just not live-refreshing, matching how
        // useShowAllocations degrades on subscription error.
      },
    );

    return () => {
      unsubscribe();
    };
  }, [liveShowId, user]);

  const reloadUpcomingShows = useCallback(async (options?: LoadUpcomingShowsOptions) => {
    await loadUpcomingShows(options);
  }, [loadUpcomingShows]);

  return {
    ...state,
    reloadUpcomingShows,
  };
}
