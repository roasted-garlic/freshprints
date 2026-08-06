import { useEffect, useRef, useState } from "react";

import { categoryService } from "../services/categoryService";
import { catalogTagService } from "../services/catalogTagService";
import type { CatalogTag } from "../types/catalogTag.types";
import type { Category } from "../types/category.types";
import type { User } from "../../users/types/user.types";

interface TaxonomyState {
  categories: Category[];
  tags: CatalogTag[];
  isLoading: boolean;
  isUnavailable: boolean;
  status: "loading" | "ready" | "failed" | "inactive";
}

const initialState: TaxonomyState = {
  categories: [],
  tags: [],
  isLoading: true,
  isUnavailable: false,
  status: "loading",
};

/**
 * Categories and (display/filter-only) tags for the normal ready Design Library.
 *
 * Phase 1A: Firestore-backed via `categoryService` / `catalogTagService` (active categories +
 * approved tags). Export name and `TaxonomyState` shape are preserved so AI Review callers stay
 * unchanged. Tag/Category management modals still use `useCategories` / `useCatalogTags` for the
 * full approved+archived taxonomy.
 */
export function useGeneratedDesignLibraryTaxonomy(user: User | null): TaxonomyState {
  const [state, setState] = useState<TaxonomyState>(initialState);
  const generationRef = useRef(0);

  useEffect(() => {
    if (!user) {
      setState({
        categories: [],
        tags: [],
        isLoading: false,
        isUnavailable: false,
        status: "inactive",
      });
      return;
    }

    let isCancelled = false;
    const generation = ++generationRef.current;
    setState((current) => ({
      ...current,
      isLoading: true,
      isUnavailable: false,
      status: "loading",
    }));

    void Promise.all([
      categoryService.listCategories(user),
      catalogTagService.listTags(user),
    ])
      .then(([categories, tags]) => {
        if (isCancelled || generation !== generationRef.current) return;
        setState({
          categories,
          tags,
          isLoading: false,
          isUnavailable: false,
          status: "ready",
        });
      })
      .catch(() => {
        if (isCancelled || generation !== generationRef.current) return;
        setState({
          categories: [],
          tags: [],
          isLoading: false,
          isUnavailable: true,
          status: "failed",
        });
      });

    return () => {
      isCancelled = true;
    };
  }, [user]);

  return state;
}
