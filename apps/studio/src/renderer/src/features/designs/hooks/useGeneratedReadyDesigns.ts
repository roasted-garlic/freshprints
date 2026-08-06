import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { designService, DESIGN_LIST_PAGE_SIZE } from "../services/designService";
import type { Design } from "../types/design.types";
import type { DesignListCursor } from "../types/designQuery.types";
import { sortDesignsForListQuery } from "../utils/sortDesignsForListQuery";
import type { User } from "../../users/types/user.types";

export interface ReadyIndexEntry {
  id: string;
  title: string;
  description?: string;
  categoryId?: string;
  tags: string[];
  /** Original design-creation timestamp — immutable after creation. */
  createdAtMs: number;
}

/**
 * Synthesizes a filtering-only `Design` from a ready-index entry for Assisted / library search.
 */
export function entryToFilterableDesign(entry: ReadyIndexEntry): Design {
  return {
    id: entry.id,
    title: entry.title,
    description: entry.description,
    categoryId: entry.categoryId,
    tags: entry.tags,
    status: "ready",
    originalPath: "",
    thumbnailPath: "",
    uploadedBy: "",
    queueCount: 0,
    aiProcessed: false,
    aiReviewed: false,
    createdBy: "",
    updatedBy: "",
    createdAt: undefined as unknown as Design["createdAt"],
    updatedAt: undefined as unknown as Design["updatedAt"],
  };
}

export function designToReadyIndexEntry(design: Design): ReadyIndexEntry {
  return {
    id: design.id,
    title: design.title,
    description: design.description,
    categoryId: design.categoryId,
    tags: design.tags,
    createdAtMs: design.createdAt?.toMillis?.() ?? 0,
  };
}

/** @deprecated Phase 1A no longer maps generated cards; kept for Assisted import stability. */
export function cardToDesign(design: Design): Design {
  return design;
}

const PAGE_SIZE = DESIGN_LIST_PAGE_SIZE;

type LoadState =
  | { status: "loading" }
  | { status: "ready"; designs: Design[] }
  | { status: "unavailable" };

export interface UseGeneratedReadyDesignsResult {
  entries: ReadyIndexEntry[];
  isLoading: boolean;
  isUnavailable: boolean;
  /** Always true in Phase 1A — complete Firestore pagination is the sole source. */
  usedFirestoreFallback: boolean;
  fallbackDesigns: Design[];
  resolveVisibleCards: (ids: string[]) => Promise<Map<string, Design>>;
  applyLocalEntryPatch: (designId: string, patch: Partial<ReadyIndexEntry>) => void;
  reconcileAuthoritativeDesign: (design: Design) => Promise<{
    card: Design;
    entry: ReadyIndexEntry | null;
    cardCacheInvalidated: boolean;
    preservedSortValue: boolean;
  }>;
  removeLocalEntry: (designId: string) => void;
}

async function loadAllReadyDesignsFromFirestore(user: User): Promise<Design[]> {
  const designs: Design[] = [];
  let cursor: DesignListCursor | undefined;

  for (;;) {
    const page = await designService.listDesignsPage(user, {
      sortField: "createdAt",
      sortDirection: "desc",
      statusIn: ["ready"],
      limitCount: PAGE_SIZE,
      ...(cursor ? { cursor } : {}),
    });
    designs.push(...page.designs);
    if (!page.hasMore || !page.nextCursor) {
      break;
    }
    cursor = page.nextCursor;
  }

  return sortDesignsForListQuery(designs, "createdAt", "desc");
}

/**
 * Phase 1A: complete Firestore pagination for Assisted Creation ready designs.
 * No generated ready-index. Paginate to exhaustion so catalogs larger than one page stay complete.
 */
export function useGeneratedReadyDesigns(user: User | null): UseGeneratedReadyDesignsResult {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [localPatches, setLocalPatches] = useState<Map<string, Partial<ReadyIndexEntry>>>(new Map());
  const [locallyRemovedIds, setLocallyRemovedIds] = useState<Set<string>>(new Set());
  const designsByIdRef = useRef<Map<string, Design>>(new Map());
  const generationRef = useRef(0);

  useEffect(() => {
    let isCancelled = false;
    const generation = ++generationRef.current;

    setLoadState({ status: "loading" });
    designsByIdRef.current = new Map();

    if (!user) {
      setLoadState({ status: "ready", designs: [] });
      return;
    }

    void loadAllReadyDesignsFromFirestore(user)
      .then((designs) => {
        if (isCancelled || generation !== generationRef.current) return;
        designsByIdRef.current = new Map(designs.map((design) => [design.id, design]));
        setLoadState({ status: "ready", designs });
      })
      .catch(() => {
        if (isCancelled || generation !== generationRef.current) return;
        setLoadState({ status: "unavailable" });
      });

    return () => {
      isCancelled = true;
    };
  }, [user]);

  const fallbackDesigns = useMemo(() => {
    if (loadState.status !== "ready") return [];
    return loadState.designs.filter((design) => !locallyRemovedIds.has(design.id));
  }, [loadState, locallyRemovedIds]);

  const entries = useMemo(() => {
    return fallbackDesigns.map((design) => {
      const base = designToReadyIndexEntry(design);
      const patch = localPatches.get(design.id);
      return patch ? { ...base, ...patch } : base;
    });
  }, [fallbackDesigns, localPatches]);

  const resolveVisibleCards = useCallback(async (ids: string[]): Promise<Map<string, Design>> => {
    const result = new Map<string, Design>();
    for (const id of ids) {
      const design = designsByIdRef.current.get(id);
      if (design) result.set(id, design);
    }
    return result;
  }, []);

  const applyLocalEntryPatch = useCallback((designId: string, patch: Partial<ReadyIndexEntry>) => {
    setLocalPatches((current) => new Map(current).set(designId, { ...current.get(designId), ...patch }));
  }, []);

  const reconcileAuthoritativeDesign = useCallback(async (design: Design) => {
    const existingEntry = entries.find((entry) => entry.id === design.id) ?? null;
    if (design.status !== "ready") {
      setLocallyRemovedIds((current) => new Set(current).add(design.id));
      designsByIdRef.current.delete(design.id);
      return {
        card: design,
        entry: null,
        cardCacheInvalidated: true,
        preservedSortValue: false,
      };
    }
    designsByIdRef.current.set(design.id, design);
    applyLocalEntryPatch(design.id, {
      id: design.id,
      title: design.title,
      description: design.description,
      categoryId: design.categoryId,
      tags: design.tags,
    });
    return {
      card: design,
      entry: existingEntry
        ? { ...existingEntry, title: design.title, description: design.description, categoryId: design.categoryId, tags: design.tags }
        : designToReadyIndexEntry(design),
      cardCacheInvalidated: true,
      preservedSortValue: Boolean(existingEntry),
    };
  }, [applyLocalEntryPatch, entries]);

  const removeLocalEntry = useCallback((designId: string) => {
    setLocallyRemovedIds((current) => new Set(current).add(designId));
    designsByIdRef.current.delete(designId);
  }, []);

  return {
    entries,
    isLoading: loadState.status === "loading",
    isUnavailable: loadState.status === "unavailable",
    usedFirestoreFallback: true,
    fallbackDesigns,
    resolveVisibleCards,
    applyLocalEntryPatch,
    reconcileAuthoritativeDesign,
    removeLocalEntry,
  };
}
