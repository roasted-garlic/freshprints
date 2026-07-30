import { useEffect, useRef, useState } from "react";
import {
  traceGeneratedAssetOutcome,
} from "@fresh-prints/shared/utils/firestoreUsageTrace";

import { studioCatalogAssetService } from "../services/studioCatalogAssetService";
import type { CatalogTag } from "../types/catalogTag.types";
import type { Category } from "../types/category.types";
import { clientCategoryToCategory, clientTagToCatalogTag } from "../utils/generatedReadyDesignMapping";
import type { User } from "../../users/types/user.types";

const TAXONOMY_TRACE_SOURCE = "studioDesignLibrary.generatedTaxonomy@generated-first-v3";

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
 * Categories and (display/filter-only) tags for the normal ready Design Library, sourced from the
 * same generated client-safe taxonomy snapshot Portal already publishes and consumes
 * (`generated/catalog-reference/**`) — zero Firestore reads, replacing the previously-unconditional
 * `categoryService.listCategories`/`catalogTagService.listTags` calls on every Design Library mount
 * (see the Wave C Plan amendment's taxonomy-read-gap correction).
 *
 * Not a replacement for `useCategories`/`useCatalogTags` everywhere — `TagManagementModal` and
 * `CategoryManagementModal` keep their existing Firestore-backed hooks unchanged, since those pages
 * need the full approved+archived taxonomy (including `preferredWhen`) for editing, which this
 * public, active/approved-only snapshot deliberately does not carry.
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

    void studioCatalogAssetService
      .loadClientTaxonomy()
      .then((snapshot) => {
        if (isCancelled || generation !== generationRef.current) return;
        traceGeneratedAssetOutcome("success", TAXONOMY_TRACE_SOURCE, {
          app: "studio",
          triggerReason: "route",
        });
        setState({
          categories: snapshot.categories.map(clientCategoryToCategory),
          tags: snapshot.tags.map(clientTagToCatalogTag),
          isLoading: false,
          isUnavailable: false,
          status: "ready",
        });
      })
      .catch(() => {
        if (isCancelled || generation !== generationRef.current) return;
        traceGeneratedAssetOutcome("failure", TAXONOMY_TRACE_SOURCE, {
          app: "studio",
          triggerReason: "route",
        });
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
