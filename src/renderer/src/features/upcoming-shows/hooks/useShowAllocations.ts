import { useCallback, useEffect, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { upcomingShowService } from "../services/upcomingShowService";
import type { ShowAllocation } from "../../../../../../shared/types/showAllocation/showAllocation.types";

interface ShowAllocationsState {
  allocations: ShowAllocation[];
  error: string | null;
  isLoading: boolean;
}

const initialState: ShowAllocationsState = {
  allocations: [],
  error: null,
  isLoading: true,
};

export function useShowAllocations(upcomingShowId: string | null) {
  const { user } = useAuth();
  const [state, setState] = useState<ShowAllocationsState>(initialState);

  const loadAllocations = useCallback(async () => {
    if (!user || !permissionService.canViewUpcomingShows(user) || !upcomingShowId) {
      setState({ allocations: [], error: null, isLoading: false });
      return;
    }

    setState((currentState) => ({ ...currentState, error: null, isLoading: true }));

    try {
      const allocations = await upcomingShowService.listShowAllocations(user, upcomingShowId);
      setState({ allocations, error: null, isLoading: false });
    } catch (error) {
      setState({
        allocations: [],
        error: error instanceof Error ? error.message : "Unable to load show allocations.",
        isLoading: false,
      });
    }
  }, [upcomingShowId, user]);

  useEffect(() => {
    void loadAllocations();
  }, [loadAllocations]);

  const reloadAllocations = useCallback(async () => {
    await loadAllocations();
  }, [loadAllocations]);

  return {
    ...state,
    reloadAllocations,
  };
}
