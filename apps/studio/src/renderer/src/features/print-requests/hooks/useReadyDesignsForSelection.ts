import { useCallback, useEffect, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { designService } from "../../designs/services/designService";
import type { Design } from "../../designs/types/design.types";

interface ReadyDesignsState {
  designs: Design[];
  error: string | null;
  isLoading: boolean;
}

const initialState: ReadyDesignsState = {
  designs: [],
  error: null,
  isLoading: false,
};

interface LoadReadyDesignsOptions {
  silent?: boolean;
}

export function useReadyDesignsForSelection(designIds: readonly string[] = []) {
  const { user } = useAuth();
  const [state, setState] = useState<ReadyDesignsState>(initialState);
  const designIdsKey = [...new Set(designIds)].sort().join("\u0000");

  const loadDesigns = useCallback(async (options?: LoadReadyDesignsOptions) => {
    if (!user || !permissionService.canViewPrintRequests(user)) {
      setState({ designs: [], error: null, isLoading: false });
      return;
    }

    const requestedDesignIds = designIdsKey ? designIdsKey.split("\u0000") : [];
    if (requestedDesignIds.length === 0) {
      setState({ designs: [], error: null, isLoading: false });
      return;
    }

    setState((currentState) => ({
      ...currentState,
      error: null,
      isLoading: options?.silent ? currentState.isLoading : true,
    }));

    try {
      const designs = await Promise.all(
        requestedDesignIds.map((designId) => designService.getDesignById(user, designId)),
      );
      setState({ designs, error: null, isLoading: false });
    } catch (error) {
      setState({
        designs: [],
        error: error instanceof Error ? error.message : "Unable to load ready designs.",
        isLoading: false,
      });
    }
  }, [designIdsKey, user]);

  useEffect(() => {
    void loadDesigns();
  }, [loadDesigns]);

  return {
    ...state,
    reloadDesigns: loadDesigns,
  };
}
