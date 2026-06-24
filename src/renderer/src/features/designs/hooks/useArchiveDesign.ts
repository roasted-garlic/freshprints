import { useCallback, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { designService } from "../services/designService";
import type { Design } from "../types/design.types";

interface ArchiveDesignState {
  error: string | null;
  isSubmitting: boolean;
}

const initialState: ArchiveDesignState = {
  error: null,
  isSubmitting: false,
};

export function useArchiveDesign() {
  const { user } = useAuth();
  const [state, setState] = useState<ArchiveDesignState>(initialState);

  const archiveDesign = useCallback(
    async (designId: string): Promise<Design> => {
      if (!user) {
        throw new Error("You must be signed in to archive designs.");
      }

      setState({ isSubmitting: true, error: null });

      try {
        const design = await designService.archiveDesign(user, designId);
        setState({ isSubmitting: false, error: null });
        return design;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to archive the design.";
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
    archiveDesign,
    clearError,
  };
}
