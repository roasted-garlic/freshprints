import { useCallback, useEffect, useRef, useState } from "react";
import { Timestamp } from "firebase/firestore";

import { categoryService } from "../services/categoryService";
import { catalogTagService } from "../services/catalogTagService";
import { clearStudioTaxonomyCaches } from "../services/taxonomyCacheControl";
import { loadStudioTaxonomyPreferringMaterialization } from "../services/taxonomyMaterializationService";
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
 * Categories + approved tags for Design Library / AI Review.
 *
 * Prefers compact `taxonomyMaterialization` (revision short-circuit + local cache).
 * Falls back to Firestore listCategories/listTags when materialization is not bootstrapped.
 *
 * After Tag Management writes, call `reloadFromAuthoritativeSource` so newly created tags
 * appear in design-form suggestions before Cloud Function materialization catches up.
 */
export function useGeneratedDesignLibraryTaxonomy(user: User | null): TaxonomyState & {
  reloadFromAuthoritativeSource: () => Promise<void>;
} {
  const [state, setState] = useState<TaxonomyState>(initialState);
  const generationRef = useRef(0);

  const loadPreferred = useCallback(async (generation: number, isCancelled: () => boolean) => {
    if (!user) {
      return;
    }

    setState((current) => ({
      ...current,
      isLoading: true,
      isUnavailable: false,
      status: "loading",
    }));

    try {
      const preferred = await loadStudioTaxonomyPreferringMaterialization();
      if (isCancelled() || generation !== generationRef.current) return;

      if (preferred.source === "disk-cache" || preferred.source === "materialization") {
        const epoch = Timestamp.fromMillis(0);
        const categories: Category[] = preferred.categories.map((c) => ({
          ...c,
          createdAt: epoch,
          updatedAt: epoch,
        }));
        setState({
          categories,
          tags: preferred.tags,
          isLoading: false,
          isUnavailable: false,
          status: "ready",
        });
        return;
      }

      // Pre-bootstrap / unavailable materialization → legacy FS lists (RC4).
      const [categories, tags] = await Promise.all([
        categoryService.listCategories(user),
        catalogTagService.listTags(user),
      ]);
      if (isCancelled() || generation !== generationRef.current) return;
      setState({
        categories,
        tags,
        isLoading: false,
        isUnavailable: false,
        status: "ready",
      });
    } catch {
      if (isCancelled() || generation !== generationRef.current) return;
      setState({
        categories: [],
        tags: [],
        isLoading: false,
        isUnavailable: true,
        status: "failed",
      });
    }
  }, [user]);

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
    void loadPreferred(generation, () => isCancelled);

    return () => {
      isCancelled = true;
    };
  }, [loadPreferred, user]);

  const reloadFromAuthoritativeSource = useCallback(async () => {
    if (!user) {
      return;
    }

    // Drop disk/list caches so Tag Management creates/updates are visible immediately
    // (materialization CF rebuild can lag a few seconds).
    clearStudioTaxonomyCaches();
    const generation = ++generationRef.current;
    setState((current) => ({
      ...current,
      isLoading: true,
      isUnavailable: false,
      status: "loading",
    }));

    try {
      const [categories, tags] = await Promise.all([
        categoryService.listCategories(user),
        catalogTagService.listTags(user),
      ]);
      if (generation !== generationRef.current) return;
      setState({
        categories,
        tags,
        isLoading: false,
        isUnavailable: false,
        status: "ready",
      });
    } catch {
      if (generation !== generationRef.current) return;
      setState({
        categories: [],
        tags: [],
        isLoading: false,
        isUnavailable: true,
        status: "failed",
      });
    }
  }, [user]);

  return { ...state, reloadFromAuthoritativeSource };
}
