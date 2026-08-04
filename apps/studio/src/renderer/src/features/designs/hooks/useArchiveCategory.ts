import { useCallback, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { categoryService } from "../services/categoryService";
import { taxonomyArchiveGuardsService } from "../services/taxonomyArchiveGuardsService";
import { clearStudioTaxonomyCaches } from "../services/taxonomyCacheControl";
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
        const result = await taxonomyArchiveGuardsService.archiveCategory(categoryId);
        if (result.outcome === "blocked") {
          const message = result.blockers?.[0]?.message ?? result.message;
          setState({ isSubmitting: false, error: message });
          throw new Error(message);
        }
        // archiveCategoryWithGuards writes through the Admin SDK, bypassing
        // the client-side categoryListCache entirely. Without this, the
        // cache serves pre-archive data even though the write succeeded.
        // Only clear on confirmed success, never on a blocked/failed
        // attempt.
        clearStudioTaxonomyCaches();
        const category = await categoryService.getCategoryById(user, categoryId);
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
