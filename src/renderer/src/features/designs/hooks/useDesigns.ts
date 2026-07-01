import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { designService } from "../services/designService";
import type { Design } from "../types/design.types";
import type { DesignListCursor, DesignListQuery } from "../types/designQuery.types";

interface DesignsState {
  designs: Design[];
  error: string | null;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  nextCursor?: DesignListCursor;
}

interface UseDesignsOptions {
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
  const loadAll = options?.loadAll ?? false;
  const maxLoadAll = options?.maxLoadAll ?? DEFAULT_MAX_LOAD_ALL;

  const loadDesigns = useCallback(
    async (loadOptions?: { append?: boolean }) => {
      if (!user || !permissionService.canViewDesigns(user)) {
        nextCursorRef.current = undefined;
        setState({ ...initialState, isLoading: false });
        return;
      }

      const append = loadOptions?.append ?? false;

      setState((currentState) => ({
        ...currentState,
        error: null,
        isLoading: append ? currentState.isLoading : true,
        isLoadingMore: append,
      }));

      try {
        if (loadAll && !append) {
          // Page the indexed query to completion (bounded) so the full scope is in memory.
          const collected: Design[] = [];
          let cursor: DesignListCursor | undefined = undefined;
          let hasMore = false;

          do {
            const page = await designService.listDesignsPage(user, { ...listQuery, cursor });
            collected.push(...page.designs);
            cursor = page.nextCursor;
            hasMore = page.hasMore;
          } while (cursor && collected.length < maxLoadAll);

          nextCursorRef.current = cursor;

          setState({
            designs: collected,
            error: null,
            // If we stopped at the safety cap there may still be more on the server.
            hasMore: Boolean(cursor) && hasMore,
            isLoading: false,
            isLoadingMore: false,
            nextCursor: cursor,
          });
          return;
        }

        const page = await designService.listDesignsPage(user, {
          ...listQuery,
          cursor: append ? nextCursorRef.current : undefined,
        });

        nextCursorRef.current = page.nextCursor;

        setState((currentState) => ({
          designs: append ? [...currentState.designs, ...page.designs] : page.designs,
          error: null,
          hasMore: page.hasMore,
          isLoading: false,
          isLoadingMore: false,
          nextCursor: page.nextCursor,
        }));
      } catch (error) {
        nextCursorRef.current = undefined;
        setState({
          designs: [],
          error: error instanceof Error ? error.message : "Unable to load designs.",
          hasMore: false,
          isLoading: false,
          isLoadingMore: false,
          nextCursor: undefined,
        });
      }
    },
    [listQuery, loadAll, maxLoadAll, user],
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
        return currentState;
      }

      const nextDesigns = currentState.designs.slice();
      nextDesigns[index] = { ...nextDesigns[index], ...patch };

      return { ...currentState, designs: nextDesigns };
    });
  }, []);

  return {
    ...state,
    applyDesignPatch,
    loadMoreDesigns,
    reloadDesigns,
  };
}
