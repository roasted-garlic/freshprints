import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { upcomingShowService } from "../services/upcomingShowService";
import type { ShowAllocation } from "@fresh-prints/shared/types/showAllocation/showAllocation.types";

interface ShowAllocationsState {
  allocations: ShowAllocation[];
  error: string | null;
  isLoading: boolean;
}

const initialState: ShowAllocationsState = {
  allocations: [],
  error: null,
  isLoading: true,
};

/**
 * Live per-show subscription (Plan Section 21.3/21.4, Fix 3) — replaces the previous one-shot
 * `getDocs` fetch, which left an already-open Show Queue session unaware of a Portal-submitted
 * allocation until the page remounted. Wired through `upcomingShowService.subscribeToShowAllocations`
 * (itself routed through `createSharedFirestoreSubscription`), scoped to exactly one
 * `upcomingShowId` at a time. `reloadAllocations` is kept for interface stability (existing
 * callers like `UpcomingShowsPage.tsx` call it after a mutation) but is now a light no-op-safe
 * shim: the live subscription already reflects server truth, so an explicit reload is not
 * required for correctness, only kept so no caller needs to change.
 */
export function useShowAllocations(upcomingShowId: string | null) {
  const { user } = useAuth();
  const [state, setState] = useState<ShowAllocationsState>(initialState);
  const activeShowIdRef = useRef<string | null>(null);
  const allocationsCacheRef = useRef<Map<string, ShowAllocation[]>>(new Map());

  useEffect(() => {
    activeShowIdRef.current = upcomingShowId;

    if (!user || !permissionService.canViewUpcomingShows(user) || !upcomingShowId) {
      setState({ allocations: [], error: null, isLoading: false });
      return;
    }

    const cachedAllocations = allocationsCacheRef.current.get(upcomingShowId);
    setState({
      allocations: cachedAllocations ?? [],
      error: null,
      isLoading: cachedAllocations === undefined,
    });

    const unsubscribe = upcomingShowService.subscribeToShowAllocations(
      user,
      upcomingShowId,
      (allocations) => {
        if (activeShowIdRef.current !== upcomingShowId) {
          return;
        }
        allocationsCacheRef.current.set(upcomingShowId, allocations);
        setState({ allocations, error: null, isLoading: false });
      },
      (message) => {
        if (activeShowIdRef.current !== upcomingShowId) {
          return;
        }
        setState({ allocations: [], error: message, isLoading: false });
      },
    );

    return () => {
      unsubscribe();
    };
  }, [upcomingShowId, user]);

  const reloadAllocations = useCallback(async () => {
    // The live subscription already reflects server truth on every write, including this
    // hook's own mutations' follow-up writes elsewhere in the app — no separate refetch needed.
    // Kept as a stable async no-op so existing callers (e.g. UpcomingShowsPage.tsx post-mutation
    // cleanup) do not need to change.
  }, []);

  return {
    ...state,
    reloadAllocations,
  };
}
