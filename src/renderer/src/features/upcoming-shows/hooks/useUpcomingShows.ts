import { useCallback, useEffect, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { upcomingShowService } from "../services/upcomingShowService";
import type { UpcomingShow } from "../../../../../../shared/types/upcomingShow/upcomingShow.types";

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

export function useUpcomingShows() {
  const { user } = useAuth();
  const [state, setState] = useState<UpcomingShowsState>(initialState);

  const loadUpcomingShows = useCallback(async () => {
    if (!user || !permissionService.canViewUpcomingShows(user)) {
      setState({ shows: [], error: null, isLoading: false });
      return;
    }

    setState((currentState) => ({ ...currentState, error: null, isLoading: true }));

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

  const reloadUpcomingShows = useCallback(async () => {
    await loadUpcomingShows();
  }, [loadUpcomingShows]);

  return {
    ...state,
    reloadUpcomingShows,
  };
}
