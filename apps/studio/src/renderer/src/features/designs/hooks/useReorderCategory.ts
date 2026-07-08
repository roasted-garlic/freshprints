import { useCallback, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { categoryService } from "../services/categoryService";
import type { Category } from "../types/category.types";

interface ReorderCategoryState {
  error: string | null;
  isSubmitting: boolean;
}

const initialState: ReorderCategoryState = {
  error: null,
  isSubmitting: false,
};

export function useReorderCategory() {
  const { user } = useAuth();
  const [state, setState] = useState<ReorderCategoryState>(initialState);

  const reorderCategory = useCallback(
    async (categoryId: string, targetOrder: number): Promise<Category> => {
      if (!user) {
        throw new Error("You must be signed in to manage categories.");
      }

      setState({ isSubmitting: true, error: null });

      try {
        const category = await categoryService.reorderCategory(user, categoryId, targetOrder);
        setState({ isSubmitting: false, error: null });
        return category;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to reorder the category.";
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
    reorderCategory,
  };
}
