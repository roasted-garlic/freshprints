import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { designService } from "../services/designService";
import type { Design } from "../types/design.types";
import type { DesignListCursor, DesignListQuery } from "../types/designQuery.types";
import { sortDesignsForListQuery } from "../utils/sortDesignsForListQuery";

interface DesignsState {
  designs: Design[];
  error: string | null;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  /** Query key last successfully loaded; compared to current key to avoid stale flashes. */
  loadedQueryKey: string | null;
  nextCursor?: DesignListCursor;
}

interface UseDesignsOptions {
  /** When false, keep the hook mounted without starting a Firestore query. */
  enabled?: boolean;
  /**
   * When true, pages the (indexed) query to completion on load so the caller holds the
   * full scope in memory — required for client-side search/tag faceting across the whole
   * inventory. Bounded by `maxLoadAll` as a safety cap. Existing paginated callers omit
   * this and keep the "Load more" flow.
   */
  loadAll?: boolean;
  /** Hard cap on designs fetched when `loadAll` is set. Defaults to 2000. */
  maxLoadAll?: number;
}

const DEFAULT_MAX_LOAD_ALL = 2000;

const initialState: DesignsState = {
  designs: [],
  error: null,
  hasMore: false,
  isLoading: true,
  isLoadingMore: false,
  loadedQueryKey: null,
  nextCursor: undefined,
};

function serializeDesignListQuery(listQuery: DesignListQuery): string {
  return JSON.stringify({
    aiReviewStatus: listQuery.aiReviewStatus,
    categoryId: listQuery.categoryId,
    limitCount: listQuery.limitCount,
    sortDirection: listQuery.sortDirection,
    sortField: listQuery.sortField,
    status: listQuery.status,
    statusIn: listQuery.statusIn,
    tag: listQuery.tag,
  });
}

export function useDesigns(listQuery: DesignListQuery, options?: UseDesignsOptions) {
  const { user } = useAuth();
  const [state, setState] = useState<DesignsState>(initialState);
  const nextCursorRef = useRef<DesignListCursor | undefined>(undefined);
  const listQueryKey = useMemo(() => serializeDesignListQuery(listQuery), [listQuery]);
  const listQueryKeyRef = useRef(listQueryKey);
  const listQueryRef = useRef(listQuery);
  listQueryKeyRef.current = listQueryKey;
  listQueryRef.current = listQuery;
  const loadAll = options?.loadAll ?? false;
  const enabled = options?.enabled ?? true;
  const maxLoadAll = options?.maxLoadAll ?? DEFAULT_MAX_LOAD_ALL;

  /**
   * Monotonic generation counter for this hook instance. Every `loadDesigns()` call (whether from
   * the query-key-change effect or an explicit `reloadDesigns()`) captures the generation in
   * effect at its own start; only the request whose captured generation still matches the current
   * generation when it resolves is allowed to write state. This is distinct from the existing
   * `listQueryKeyRef` check, which only guards against a *different query* landing late — it does
   * nothing when several `reloadDesigns()` calls for the *same* query race each other (e.g. three
   * designs each independently completing AI processing and each triggering their own reload).
   * Without this, an earlier-started-but-later-resolving read can overwrite state a later-started
   * read (or a local `applyDesignPatch` call) already correctly updated — visibly regressing the
   * UI (post-launch-catalog-and-processing-stability, Owner QA Amendment 4).
   */
  const generationRef = useRef(0);

  const loadDesigns = useCallback(
    async (loadOptions?: { append?: boolean }) => {
      const requestQueryKey = listQueryKeyRef.current;
      const requestGeneration = ++generationRef.current;

      if (!enabled || !user || !permissionService.canViewDesigns(user)) {
        nextCursorRef.current = undefined;
        setState({ ...initialState, isLoading: false, loadedQueryKey: requestQueryKey });
        return;
      }

      const append = loadOptions?.append ?? false;

      setState((currentState) => ({
        ...currentState,
        designs: append ? currentState.designs : [],
        error: null,
        isLoading: append ? currentState.isLoading : true,
        isLoadingMore: append,
        loadedQueryKey: append ? currentState.loadedQueryKey : null,
      }));

      try {
        const requestListQuery = listQueryRef.current;
        if (loadAll && !append) {
          const collected: Design[] = [];
          let cursor: DesignListCursor | undefined = undefined;
          let hasMore = false;

          do {
            const page = await designService.listDesignsPage(user, { ...requestListQuery, cursor });
            collected.push(...page.designs);
            cursor = page.nextCursor;
            hasMore = page.hasMore;
          } while (cursor && collected.length < maxLoadAll);

          nextCursorRef.current = cursor;

          // Ignore late responses if the query changed while we were paging, or if a newer
          // load for this same query has since started (see generationRef's doc comment).
          if (listQueryKeyRef.current !== requestQueryKey || generationRef.current !== requestGeneration) {
            return;
          }

          const sortField = requestListQuery.sortField ?? "updatedAt";
          const sortDirection = requestListQuery.sortDirection ?? "desc";
          // loadAll concatenates pages; enforce final order so oldest-first never sticks.
          const designs = sortDesignsForListQuery(collected, sortField, sortDirection);

          setState({
            designs,
            error: null,
            hasMore: Boolean(cursor) && hasMore,
            isLoading: false,
            isLoadingMore: false,
            loadedQueryKey: requestQueryKey,
            nextCursor: cursor,
          });
          return;
        }

        const page = await designService.listDesignsPage(user, {
          ...requestListQuery,
          cursor: append ? nextCursorRef.current : undefined,
        });

        if (listQueryKeyRef.current !== requestQueryKey || generationRef.current !== requestGeneration) {
          return;
        }

        nextCursorRef.current = page.nextCursor;

        setState((currentState) => ({
          designs: append ? [...currentState.designs, ...page.designs] : page.designs,
          error: null,
          hasMore: page.hasMore,
          isLoading: false,
          isLoadingMore: false,
          loadedQueryKey: requestQueryKey,
          nextCursor: page.nextCursor,
        }));
      } catch (error) {
        if (listQueryKeyRef.current !== requestQueryKey || generationRef.current !== requestGeneration) {
          return;
        }

        nextCursorRef.current = undefined;
        setState({
          designs: [],
          error: error instanceof Error ? error.message : "Unable to load designs.",
          hasMore: false,
          isLoading: false,
          isLoadingMore: false,
          loadedQueryKey: requestQueryKey,
          nextCursor: undefined,
        });
      }
    },
    [enabled, loadAll, maxLoadAll, user],
  );

  useEffect(() => {
    nextCursorRef.current = undefined;
    void loadDesigns();
  }, [listQueryKey, loadDesigns]);

  const loadMoreDesigns = useCallback(() => {
    if (!state.hasMore || state.isLoadingMore || state.isLoading) {
      return;
    }

    void loadDesigns({ append: true });
  }, [loadDesigns, state.hasMore, state.isLoading, state.isLoadingMore]);

  const reloadDesigns = useCallback(async () => {
    nextCursorRef.current = undefined;
    await loadDesigns();
  }, [loadDesigns]);

  const applyDesignPatch = useCallback((designId: string, patch: Partial<Design>) => {
    setState((currentState) => {
      const index = currentState.designs.findIndex((design) => design.id === designId);

      if (index < 0) {
        // Genuinely a no-op (e.g. the design isn't part of this hook instance's current list, or
        // the initial load simply hasn't resolved yet) — do NOT bump the generation here. Doing
        // so unconditionally would invalidate a real, still-in-flight load for no reason whenever
        // a patch happens to target a design this instance never had, discarding data that load
        // would otherwise have correctly delivered.
        return currentState;
      }

      // Bump the generation only when the patch genuinely changes local state, so any reload
      // already in flight (started before this patch, carrying an older captured generation) is
      // discarded on arrival instead of overwriting this patch with stale data — a reload started
      // after this patch still gets its own fresh generation and is honored normally as a
      // legitimate newer confirmation read.
      generationRef.current += 1;

      const nextDesigns = currentState.designs.slice();
      nextDesigns[index] = { ...nextDesigns[index], ...patch };

      return { ...currentState, designs: nextDesigns };
    });
  }, []);

  const isAwaitingCurrentQuery = state.isLoading || state.loadedQueryKey !== listQueryKey;

  return {
    designs: state.designs,
    error: state.error,
    hasMore: state.hasMore,
    isLoading: isAwaitingCurrentQuery,
    isLoadingMore: state.isLoadingMore,
    applyDesignPatch,
    loadMoreDesigns,
    reloadDesigns,
  };
}
