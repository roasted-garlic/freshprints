import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import {
  entryToFilterableDesign,
  useGeneratedReadyDesigns,
} from "../../designs/hooks/useGeneratedReadyDesigns";
import type { Design } from "../../designs/types/design.types";
import { permissionService } from "../../permissions/services/permissionService";
import {
  filterAssistedCatalogDesignsBySearch,
  limitAssistedCatalogPickerDesigns,
} from "../utils/assistedCatalogDesignPickerSearch";

export interface UseReadyDesignsForAssistedCatalogPickerResult {
  /** Designs ready to render in the picker (thumbnails resolved when generated cards load). */
  designs: Design[];
  /** Unfiltered ready catalog size before search (for empty-state copy). */
  catalogCount: number;
  isLoading: boolean;
  isUnavailable: boolean;
  error: string | null;
}

/**
 * Browse-capable ready-design source for Assisted library-share.
 * Uses the Design Library generated ready-index (ADR-FP-120) with bounded Firestore fallback.
 * Does **not** use ID-only `useReadyDesignsForSelection` (Wave C Print Request contract).
 */
export function useReadyDesignsForAssistedCatalogPicker(
  searchQuery: string,
): UseReadyDesignsForAssistedCatalogPickerResult {
  const { user } = useAuth();
  const allowed = Boolean(user && permissionService.canViewDesigns(user));
  const generated = useGeneratedReadyDesigns(allowed ? user : null);

  const {
    entries,
    fallbackDesigns,
    isLoading: generatedLoading,
    isUnavailable: generatedUnavailable,
    resolveVisibleCards,
    usedFirestoreFallback,
  } = generated;

  const browseDesigns = useMemo((): Design[] => {
    if (!allowed) {
      return [];
    }
    if (usedFirestoreFallback) {
      return fallbackDesigns.filter((design) => design.status === "ready");
    }
    return entries.map(entryToFilterableDesign);
  }, [allowed, entries, fallbackDesigns, usedFirestoreFallback]);

  const filtered = useMemo(
    () =>
      limitAssistedCatalogPickerDesigns(
        filterAssistedCatalogDesignsBySearch(browseDesigns, searchQuery),
      ),
    [browseDesigns, searchQuery],
  );

  const filteredIdsKey = filtered.map((design) => design.id).join("\u0000");
  const [cardsById, setCardsById] = useState<Map<string, Design>>(new Map());
  const [cardsUnavailable, setCardsUnavailable] = useState(false);

  useEffect(() => {
    if (!allowed || usedFirestoreFallback || generatedLoading) {
      setCardsById(new Map());
      setCardsUnavailable(false);
      return;
    }

    const ids = filteredIdsKey ? filteredIdsKey.split("\u0000") : [];
    if (ids.length === 0) {
      setCardsById(new Map());
      setCardsUnavailable(false);
      return;
    }

    let cancelled = false;
    setCardsUnavailable(false);
    void resolveVisibleCards(ids)
      .then((map) => {
        if (cancelled) return;
        setCardsById(map);
        setCardsUnavailable(false);
      })
      .catch(() => {
        if (cancelled) return;
        setCardsById(new Map());
        setCardsUnavailable(true);
      });

    return () => {
      cancelled = true;
    };
  }, [
    allowed,
    filteredIdsKey,
    generatedLoading,
    resolveVisibleCards,
    usedFirestoreFallback,
  ]);

  const designs = useMemo(() => {
    if (usedFirestoreFallback) {
      return filtered;
    }
    return filtered.map((design) => cardsById.get(design.id) ?? design);
  }, [cardsById, filtered, usedFirestoreFallback]);

  const isUnavailable = generatedUnavailable || cardsUnavailable;

  return {
    designs,
    catalogCount: browseDesigns.length,
    isLoading: allowed && generatedLoading,
    isUnavailable,
    error: isUnavailable
      ? "Ready designs are temporarily unavailable. Try again in a moment."
      : null,
  };
}
