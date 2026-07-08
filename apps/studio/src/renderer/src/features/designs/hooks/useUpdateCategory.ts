import { useCallback, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { categoryService } from "../services/categoryService";
import type { Category, UpdateCategoryInput } from "../types/category.types";

interface UpdateCategoryState {
  error: string | null;
  isSubmitting: boolean;
}

const initialState: UpdateCategoryState = {
  error: null,
  isSubmitting: false,
};

export function useUpdateCategory() {
  const { user } = useAuth();
  const [state, setState] = useState<UpdateCategoryState>(initialState);

  const updateCategory = useCallback(
    async (categoryId: string, input: UpdateCategoryInput): Promise<Category> => {
      if (!user) {
        throw new Error("You must be signed in to manage categories.");
      }

      setState({ isSubmitting: true, error: null });

      try {
        const category = await categoryService.updateCategory(user, categoryId, input);
        setState({ isSubmitting: false, error: null });
        return category;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to update the category.";
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
    updateCategory,
  };
}
