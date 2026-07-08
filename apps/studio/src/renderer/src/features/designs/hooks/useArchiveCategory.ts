import { useCallback, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { categoryService } from "../services/categoryService";
import type { Category } from "../types/category.types";

interface ArchiveCategoryState {
  error: string | null;
  isSubmitting: boolean;
}

const initialState: ArchiveCategoryState = {
  error: null,
  isSubmitting: false,
};

export function useArchiveCategory() {
  const { user } = useAuth();
  const [state, setState] = useState<ArchiveCategoryState>(initialState);

  const archiveCategory = useCallback(
    async (categoryId: string): Promise<Category> => {
      if (!user) {
        throw new Error("You must be signed in to manage categories.");
      }

      setState({ isSubmitting: true, error: null });

      try {
        const category = await categoryService.archiveCategory(user, categoryId);
        setState({ isSubmitting: false, error: null });
        return category;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to archive the category.";
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
    archiveCategory,
    clearError,
  };
}
