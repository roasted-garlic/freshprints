import { useCallback, useEffect, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { designService } from "../services/designService";
import type { Design } from "../types/design.types";
import type { DesignListQuery } from "../types/designQuery.types";

interface DesignsState {
  designs: Design[];
  error: string | null;
  isLoading: boolean;
}

const initialState: DesignsState = {
  designs: [],
  error: null,
  isLoading: true,
};

export function useDesigns(listQuery: DesignListQuery) {
  const { user } = useAuth();
  const [state, setState] = useState<DesignsState>(initialState);

  const loadDesigns = useCallback(async () => {
    if (!user || !permissionService.canViewDesigns(user)) {
      setState({ designs: [], error: null, isLoading: false });
      return;
    }

    setState((currentState) => ({
      ...currentState,
      error: null,
      isLoading: true,
    }));

    try {
      const designs = await designService.listDesigns(user, listQuery);
      setState({
        designs,
        error: null,
        isLoading: false,
      });
    } catch (error) {
      setState({
        designs: [],
        error: error instanceof Error ? error.message : "Unable to load designs.",
        isLoading: false,
      });
    }
  }, [listQuery, user]);

  useEffect(() => {
    void loadDesigns();
  }, [loadDesigns]);

  return {
    ...state,
    reloadDesigns: loadDesigns,
  };
}
