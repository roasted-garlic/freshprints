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

export function useDesigns(listQuery: DesignListQuery) {
  const { user } = useAuth();
  const [state, setState] = useState<DesignsState>(initialState);
  const nextCursorRef = useRef<DesignListCursor | undefined>(undefined);
  const listQueryKey = useMemo(() => serializeDesignListQuery(listQuery), [listQuery]);

  const loadDesigns = useCallback(
    async (options?: { append?: boolean }) => {
      if (!user || !permissionService.canViewDesigns(user)) {
        nextCursorRef.current = undefined;
        setState({ ...initialState, isLoading: false });
        return;
      }

      const append = options?.append ?? false;

      setState((currentState) => ({
        ...currentState,
        error: null,
        isLoading: append ? currentState.isLoading : true,
        isLoadingMore: append,
      }));

      try {
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
    [listQuery, user],
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

  return {
    ...state,
    loadMoreDesigns,
    reloadDesigns,
  };
}
