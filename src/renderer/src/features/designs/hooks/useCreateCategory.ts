import { useCallback, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { categoryService } from "../services/categoryService";
import type { Category, CreateCategoryInput } from "../types/category.types";

interface CreateCategoryState {
  error: string | null;
  isSubmitting: boolean;
}

const initialState: CreateCategoryState = {
  error: null,
  isSubmitting: false,
};

export function useCreateCategory() {
  const { user } = useAuth();
  const [state, setState] = useState<CreateCategoryState>(initialState);

  const createCategory = useCallback(
    async (input: CreateCategoryInput): Promise<Category> => {
      if (!user) {
        throw new Error("You must be signed in to manage categories.");
      }

      setState({ isSubmitting: true, error: null });

      try {
        const category = await categoryService.createCategory(user, input);
        setState({ isSubmitting: false, error: null });
        return category;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to create the category.";
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
    createCategory,
  };
}
