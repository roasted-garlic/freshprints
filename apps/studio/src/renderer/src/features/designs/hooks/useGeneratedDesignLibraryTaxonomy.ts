import { useCallback, useEffect, useRef, useState } from "react";
import { Timestamp } from "firebase/firestore";

import { categoryService } from "../services/categoryService";
import { clearStudioTaxonomyCaches } from "../services/taxonomyCacheControl";
import { loadStudioTaxonomyPreferringMaterialization } from "../services/taxonomyMaterializationService";
import type { Category } from "../types/category.types";
import type { CatalogTag } from "../types/catalogTag.types";
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
 * Categories for Design Library / AI Review. Legacy tag payloads remain only as an inert cache
 * compatibility shape and are never read or exposed to active callers.
 *
 * Prefers compact `taxonomyMaterialization` (revision short-circuit + local cache).
 * Falls back to Firestore listCategories when materialization is not bootstrapped.
 *
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
          tags: [],
          isLoading: false,
          isUnavailable: false,
          status: "ready",
        });
        return;
      }

      // Pre-bootstrap / unavailable materialization → legacy FS lists (RC4).
      const categories = await categoryService.listCategories(user);
      if (isCancelled() || generation !== generationRef.current) return;
      setState({
        categories,
        tags: [],
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

    // Drop local taxonomy caches before refreshing the authoritative category list.
    clearStudioTaxonomyCaches();
    const generation = ++generationRef.current;
    setState((current) => ({
      ...current,
      isLoading: true,
      isUnavailable: false,
      status: "loading",
    }));

    try {
      const categories = await categoryService.listCategories(user);
      if (generation !== generationRef.current) return;
      setState({
        categories,
        tags: [],
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
