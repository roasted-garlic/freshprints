import { useCallback, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { designService } from "../services/designService";
import type { Design, UpdateDesignInput } from "../types/design.types";

interface UpdateDesignState {
  error: string | null;
  isSubmitting: boolean;
}

const initialState: UpdateDesignState = {
  error: null,
  isSubmitting: false,
};

export function useUpdateDesign() {
  const { user } = useAuth();
  const [state, setState] = useState<UpdateDesignState>(initialState);

  const updateDesign = useCallback(
    async (designId: string, input: UpdateDesignInput): Promise<Design> => {
      if (!user) {
        throw new Error("You must be signed in to edit designs.");
      }

      setState({ isSubmitting: true, error: null });

      try {
        const design = await designService.updateDesign(user, designId, input);
        setState({ isSubmitting: false, error: null });
        return design;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to update the design.";
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
    updateDesign,
  };
}
