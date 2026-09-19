import { useCallback, useEffect, useRef, useState } from "react";

import { permissionService } from "../../permissions/services/permissionService";
import type { User } from "../../users/types/user.types";
import {
  STAFF_ARTWORK_PAGE_SIZE,
  staffArtworkService,
  type StaffArtworkListCursor,
} from "../services/staffArtworkService";
import type { StaffArtworkSummary } from "@fresh-prints/shared/types/staffArtwork/staffArtwork.types";

interface StaffArtworkListState {
  artworks: StaffArtworkSummary[];
  error: string | null;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  loadedQueryKey: string | null;
  nextCursor?: StaffArtworkListCursor;
}

const initialState: StaffArtworkListState = {
  artworks: [],
  error: null,
  hasMore: false,
  isLoading: true,
  isLoadingMore: false,
  loadedQueryKey: null,
};

export function useStaffArtworkList(user: User | null | undefined, customerId?: string | null) {
  const [state, setState] = useState<StaffArtworkListState>(initialState);
  const queryKey = customerId ?? "all";
  const queryKeyRef = useRef(queryKey);
  const nextCursorRef = useRef<StaffArtworkListCursor | undefined>();
  const generationRef = useRef(0);
  queryKeyRef.current = queryKey;

  const load = useCallback(
    async (options: { append?: boolean; fromServer?: boolean } = {}) => {
      const append = options.append ?? false;
      const requestQueryKey = queryKeyRef.current;
      const requestGeneration = ++generationRef.current;
      if (!user || !permissionService.canViewStaffArtwork(user)) {
        nextCursorRef.current = undefined;
        setState({ ...initialState, isLoading: false, loadedQueryKey: requestQueryKey });
        return;
      }

      setState((current) => ({
        ...current,
        artworks: append ? current.artworks : [],
        error: null,
        isLoading: append ? current.isLoading : true,
        isLoadingMore: append,
        loadedQueryKey: append ? current.loadedQueryKey : null,
      }));

      try {
        const page = await staffArtworkService.listPage(user, {
          customerId: customerId ?? undefined,
          cursor: append ? nextCursorRef.current : undefined,
          fromServer: options.fromServer,
          pageSize: STAFF_ARTWORK_PAGE_SIZE,
        });
        if (queryKeyRef.current !== requestQueryKey || generationRef.current !== requestGeneration) {
          return;
        }
        nextCursorRef.current = page.nextCursor;
        setState((current) => ({
          artworks: append ? [...current.artworks, ...page.artworks] : page.artworks,
          error: null,
          hasMore: page.hasMore,
          isLoading: false,
          isLoadingMore: false,
          loadedQueryKey: requestQueryKey,
          nextCursor: page.nextCursor,
        }));
      } catch (cause) {
        if (queryKeyRef.current !== requestQueryKey || generationRef.current !== requestGeneration) {
          return;
        }
        nextCursorRef.current = undefined;
        setState({
          ...initialState,
          error: cause instanceof Error ? cause.message : "Unable to load Staff Artwork.",
          isLoading: false,
          loadedQueryKey: requestQueryKey,
        });
      }
    },
    [customerId, user],
  );

  useEffect(() => {
    nextCursorRef.current = undefined;
    void load();
  }, [load, queryKey]);

  const loadMore = useCallback(() => {
    if (!state.hasMore || state.isLoading || state.isLoadingMore) return;
    void load({ append: true });
  }, [load, state.hasMore, state.isLoading, state.isLoadingMore]);

  const reload = useCallback(
    async (options: { fromServer?: boolean } = {}) => {
      nextCursorRef.current = undefined;
      await load({ fromServer: options.fromServer });
    },
    [load],
  );

  const removeArtwork = useCallback((staffArtworkId: string) => {
    generationRef.current += 1;
    setState((current) => ({
      ...current,
      artworks: current.artworks.filter((artwork) => artwork.id !== staffArtworkId),
    }));
  }, []);

  return {
    artworks: state.artworks,
    error: state.error,
    hasMore: state.hasMore,
    isLoading: state.isLoading || state.loadedQueryKey !== queryKey,
    isLoadingMore: state.isLoadingMore,
    loadMore,
    reload,
    removeArtwork,
  };
}
