import { useCallback, useEffect, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { categoryService } from "../services/categoryService";
import type { Category } from "../types/category.types";

interface CategoriesState {
  categories: Category[];
  error: string | null;
  isLoading: boolean;
}

const initialState: CategoriesState = {
  categories: [],
  error: null,
  isLoading: true,
};

export function useCategories(options: { enabled?: boolean } = {}) {
  const { user } = useAuth();
  const [state, setState] = useState<CategoriesState>(initialState);

  const loadCategories = useCallback(async () => {
    if (options.enabled === false || !user || !permissionService.canViewDesigns(user)) {
      setState({ categories: [], error: null, isLoading: false });
      return;
    }

    setState((currentState) => ({
      ...currentState,
      error: null,
      isLoading: true,
    }));

    try {
      const categories = await categoryService.listCategories(user, { includeInactive: true });
      setState({
        categories,
        error: null,
        isLoading: false,
      });
    } catch (error) {
      setState({
        categories: [],
        error: error instanceof Error ? error.message : "Unable to load categories.",
        isLoading: false,
      });
    }
  }, [options.enabled, user]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  return {
    ...state,
    reloadCategories: loadCategories,
  };
}
