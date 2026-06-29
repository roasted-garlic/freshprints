import { useCallback, useEffect, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { printRequestService } from "../services/printRequestService";
import type { Design } from "../../designs/types/design.types";

interface ReadyDesignsState {
  designs: Design[];
  error: string | null;
  isLoading: boolean;
}

const initialState: ReadyDesignsState = {
  designs: [],
  error: null,
  isLoading: true,
};

export function useReadyDesignsForSelection() {
  const { user } = useAuth();
  const [state, setState] = useState<ReadyDesignsState>(initialState);

  const loadDesigns = useCallback(async () => {
    if (!user || !permissionService.canViewPrintRequests(user)) {
      setState({ designs: [], error: null, isLoading: false });
      return;
    }

    setState((currentState) => ({ ...currentState, error: null, isLoading: true }));

    try {
      const designs = await printRequestService.listReadyDesigns(user);
      setState({ designs, error: null, isLoading: false });
    } catch (error) {
      setState({
        designs: [],
        error: error instanceof Error ? error.message : "Unable to load ready designs.",
        isLoading: false,
      });
    }
  }, [user]);

  useEffect(() => {
    void loadDesigns();
  }, [loadDesigns]);

  return {
    ...state,
    reloadDesigns: loadDesigns,
  };
}
