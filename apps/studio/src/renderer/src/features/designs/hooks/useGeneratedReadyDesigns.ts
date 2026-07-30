import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  traceGeneratedAssetOutcome,
  traceGeneratedFallbackActivation,
} from "@fresh-prints/shared/utils/firestoreUsageTrace";

import { designService, DESIGN_LIST_PAGE_SIZE } from "../services/designService";
import { studioCatalogAssetService } from "../services/studioCatalogAssetService";
import { studioGeneratedCardOverrideService } from "../services/studioGeneratedCardOverrideService";
import type { Design } from "../types/design.types";
import {
  authoritativeDesignToReadyIndexPatch,
  authoritativeDesignToPortalCatalogCard,
  buildGeneratedDesignReconciliation,
  cardToDesign,
  type ReadyIndexEntry,
} from "../utils/generatedReadyDesignMapping";
import { sortDesignsForListQuery } from "../utils/sortDesignsForListQuery";
import { loadGeneratedReadyDesignsWithVerifiedFallback } from "../utils/generatedReadyDesignLoad";
import type { User } from "../../users/types/user.types";

export type { ReadyIndexEntry } from "../utils/generatedReadyDesignMapping";
export { cardToDesign, entryToFilterableDesign } from "../utils/generatedReadyDesignMapping";

const PAGE_SIZE = DESIGN_LIST_PAGE_SIZE;
const READY_INDEX_TRACE_SOURCE = "studioDesignLibrary.readyIndex@generated-first-v3";

type GeneratedState =
  | { status: "loading" }
  | { status: "ready"; entries: ReadyIndexEntry[] }
  | { status: "unavailable" };

export interface UseGeneratedReadyDesignsResult {
  /** The complete, ordered ready-index (id/title/description/categoryId/tags/createdAtMs) — feed
   * this into Studio's existing `filterDesignsBySearch`/`filterDesignsByCategory`/
   * `filterDesignsByTags`/`computeFacetedTagsForDraftSelection` exactly as `designs` from
   * `useDesigns` is used today, then resolve only the final visible page's full card fields via
   * `resolveVisibleCards`. */
  entries: ReadyIndexEntry[];
  isLoading: boolean;
  isUnavailable: boolean;
  usedFirestoreFallback: boolean;
  /** Firestore-fallback-sourced full `Design` objects — only populated when the generated index
   * failed to load and normal unfiltered browse fell back to the bounded Firestore page. */
  fallbackDesigns: Design[];
  /** Resolves full card fields (title/description/thumbnail/etc.) for exactly the given IDs —
   * pass only the currently visible page's IDs after filtering/pagination. Bounded to the buckets
   * those IDs hash into; shared in-flight/cached at the service layer. */
  resolveVisibleCards: (ids: string[]) => Promise<Map<string, Design>>;
  /** Local-only card patch after a save, so the list reflects an edit before the next republish. */
  applyLocalEntryPatch: (designId: string, patch: Partial<ReadyIndexEntry>) => void;
  reconcileAuthoritativeDesign: (design: Design) => Promise<{
    card: Design;
    entry: ReadyIndexEntry | null;
    cardCacheInvalidated: boolean;
    preservedSortValue: boolean;
  }>;
  /** Removes a design from the local generated-derived index immediately after archiving. */
  removeLocalEntry: (designId: string) => void;
}

/**
 * Loads the complete Studio ready-design index once (id/title/description/categoryId/tags/
 * createdAtMs, already in canonical `createdAt DESC, id DESC` order — owner-corrected 2026-07-24 so
 * print-request/show/edit activity, none of which changes createdAt, never reshuffles the visible
 * order). The caller runs Studio's
 * existing, unchanged search/category/tag/halftone/dynamic-narrowing pure functions against
 * `entries` exactly as it already does against Firestore-sourced `designs`, then calls
 * `resolveVisibleCards` only for the final visible page to fetch full card fields (thumbnail,
 * dimensions, etc.) — never one Firestore read per card, never every card bucket up front.
 *
 * Falls back to the existing bounded 100-document Firestore first page
 * (`designService.listDesignsPage`) only when the generated index itself fails to load. Once
 * loaded, `entries` covers the whole ready catalog, so search/category/tag/narrowing over it need
 * no further fallback — if a later `resolveVisibleCards` call fails, the caller shows a bounded
 * unavailable state for that page rather than re-querying Firestore (Formal Review decision).
 */
export function useGeneratedReadyDesigns(user: User | null): UseGeneratedReadyDesignsResult {
  const [generated, setGenerated] = useState<GeneratedState>({ status: "loading" });
  const [fallbackDesigns, setFallbackDesigns] = useState<Design[]>([]);
  const [usedFirestoreFallback, setUsedFirestoreFallback] = useState(false);
  const [localPatches, setLocalPatches] = useState<Map<string, Partial<ReadyIndexEntry>>>(new Map());
  const [locallyRemovedIds, setLocallyRemovedIds] = useState<Set<string>>(new Set());
  const generationRef = useRef(0);

  useEffect(() => {
    studioGeneratedCardOverrideService.setSessionScope(user?.id ?? null);
  }, [user?.id]);

  useEffect(() => {
    let isCancelled = false;
    const generation = ++generationRef.current;

    setGenerated({ status: "loading" });
    setUsedFirestoreFallback(false);
    setFallbackDesigns([]);

    void loadGeneratedReadyDesignsWithVerifiedFallback({
      loadGenerated: async () => {
        try {
          const entries = await studioCatalogAssetService.listReadyIndex();
          traceGeneratedAssetOutcome("success", READY_INDEX_TRACE_SOURCE, {
            app: "studio",
            triggerReason: "route",
          });
          return entries;
        } catch (error) {
          traceGeneratedAssetOutcome("failure", READY_INDEX_TRACE_SOURCE, {
            app: "studio",
            triggerReason: "route",
          });
          throw error;
        }
      },
      loadFirestoreFallback: user
        ? async () => {
          traceGeneratedFallbackActivation(
            "studioDesignLibrary.readyDesignFirestoreFallback@generated-first-v3",
            "generated-ready-index-terminal-failure",
            { app: "studio", triggerReason: "route" },
          );
          const page = await designService.listDesignsPage(user, {
            sortField: "updatedAt",
            sortDirection: "desc",
            statusIn: ["ready"],
            limitCount: PAGE_SIZE,
          });
          return sortDesignsForListQuery(page.designs, "updatedAt", "desc");
        }
        : undefined,
      shouldActivateFallback: () =>
        !isCancelled && generation === generationRef.current,
    }).then((result) => {
      if (isCancelled || generation !== generationRef.current) return;
      if (result.source === "generated") {
        setGenerated({ status: "ready", entries: result.entries });
        return;
      }
      setGenerated({ status: "unavailable" });
      if (result.source === "firestore-fallback") {
        setFallbackDesigns(result.entries);
        setUsedFirestoreFallback(true);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [user]);

  const entries = useMemo(() => {
    if (generated.status !== "ready") return [];
    return studioGeneratedCardOverrideService.applyReadyEntries(generated.entries)
      .filter((entry) => !locallyRemovedIds.has(entry.id))
      .map((entry) => {
        const patch = localPatches.get(entry.id);
        return patch ? { ...entry, ...patch } : entry;
      });
  }, [generated, localPatches, locallyRemovedIds]);

  const resolveVisibleCards = useCallback(async (ids: string[]): Promise<Map<string, Design>> => {
    const cardsById = await studioCatalogAssetService.loadCards(ids);
    const result = new Map<string, Design>();
    for (const id of ids) {
      const card = cardsById.get(id);
      if (card) result.set(id, cardToDesign(card));
    }
    return result;
  }, []);

  const applyLocalEntryPatch = useCallback((designId: string, patch: Partial<ReadyIndexEntry>) => {
    setLocalPatches((current) => new Map(current).set(designId, { ...current.get(designId), ...patch }));
  }, []);

  const reconcileAuthoritativeDesign = useCallback(async (design: Design) => {
    const existingEntry = entries.find((entry) => entry.id === design.id) ?? null;
    const reconciliation = buildGeneratedDesignReconciliation(existingEntry, design);
    if (design.status !== "ready") {
      studioGeneratedCardOverrideService.remove(design.id);
      setLocallyRemovedIds((current) => new Set(current).add(design.id));
      const cardCacheInvalidated = await studioCatalogAssetService.invalidateDesignCard(design.id);
      return {
        ...reconciliation,
        cardCacheInvalidated,
      };
    }
    const patch = authoritativeDesignToReadyIndexPatch(design);
    applyLocalEntryPatch(design.id, patch);
    studioGeneratedCardOverrideService.put(
      authoritativeDesignToPortalCatalogCard(design),
      existingEntry?.createdAtMs ?? design.createdAt.toMillis(),
    );
    const cardCacheInvalidated = await studioCatalogAssetService.invalidateDesignCard(design.id);
    return {
      ...reconciliation,
      cardCacheInvalidated,
    };
  }, [applyLocalEntryPatch, entries]);

  const removeLocalEntry = useCallback((designId: string) => {
    setLocallyRemovedIds((current) => new Set(current).add(designId));
  }, []);

  return {
    entries,
    isLoading: generated.status === "loading",
    isUnavailable: generated.status === "unavailable" && !usedFirestoreFallback,
    usedFirestoreFallback,
    fallbackDesigns,
    resolveVisibleCards,
    applyLocalEntryPatch,
    reconcileAuthoritativeDesign,
    removeLocalEntry,
  };
}
