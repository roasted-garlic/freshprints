import { useCallback, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { categoryService } from "../services/categoryService";
import type { Category } from "../types/category.types";

interface RestoreCategoryState {
  error: string | null;
  isSubmitting: boolean;
}

const initialState: RestoreCategoryState = {
  error: null,
  isSubmitting: false,
};

export function useRestoreCategory() {
  const { user } = useAuth();
  const [state, setState] = useState<RestoreCategoryState>(initialState);

  const restoreCategory = useCallback(
    async (categoryId: string): Promise<Category> => {
      if (!user) {
        throw new Error("You must be signed in to manage categories.");
      }

      setState({ isSubmitting: true, error: null });

      try {
        const category = await categoryService.restoreCategory(user, categoryId);
        setState({ isSubmitting: false, error: null });
        return category;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to restore the category.";
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
    restoreCategory,
  };
}
