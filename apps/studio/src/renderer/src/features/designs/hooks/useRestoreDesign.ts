import { useCallback, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { designService } from "../services/designService";
import type { Design } from "../types/design.types";

interface RestoreDesignState {
  error: string | null;
  isSubmitting: boolean;
}

const initialState: RestoreDesignState = {
  error: null,
  isSubmitting: false,
};

export function useRestoreDesign() {
  const { user } = useAuth();
  const [state, setState] = useState<RestoreDesignState>(initialState);

  const restoreDesign = useCallback(
    async (designId: string): Promise<Design> => {
      if (!user) {
        throw new Error("You must be signed in to restore designs.");
      }

      setState({ isSubmitting: true, error: null });

      try {
        const design = await designService.restoreDesign(user, designId);
        setState({ isSubmitting: false, error: null });
        return design;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to restore the design.";
        setState({ isSubmitting: false, error: message });
        throw error;
      }
    },
    [user],
  );

  const clearError = useCallback(() => {
    setState((currentState) => ({ ...currentState, error: null }));
  }, []);

  return {
    ...state,
    clearError,
    restoreDesign,
  };
}
