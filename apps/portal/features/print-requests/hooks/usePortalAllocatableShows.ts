'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { PortalAllocatableShow } from '@fresh-prints/shared/types/portal/listPortalAllocatableShows.types';

import { portalShowSelectionService } from '../services/portalShowSelectionService';

/** Keep last successful list warm across modal open/close in the same session. */
let sessionCachedShows: PortalAllocatableShow[] | null = null;
let sessionCacheAtMs = 0;
const SESSION_CACHE_TTL_MS = 60_000;

export function usePortalAllocatableShows(enabled: boolean) {
  const [shows, setShows] = useState<PortalAllocatableShow[]>(() => sessionCachedShows ?? []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const reload = useCallback(async (options?: { silent?: boolean }) => {
    const requestId = ++requestIdRef.current;
    const silent = options?.silent === true && sessionCachedShows !== null;

    if (!silent) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const nextShows = await portalShowSelectionService.listAllocatableShows();
      if (requestId !== requestIdRef.current) {
        return;
      }
      sessionCachedShows = nextShows;
      sessionCacheAtMs = Date.now();
      setShows(nextShows);
    } catch (loadError) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      if (!sessionCachedShows) {
        setShows([]);
      }
      setError(loadError instanceof Error ? loadError.message : 'Unable to load shows.');
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setError(null);
      setIsLoading(false);
      return;
    }

    const cacheAgeMs = Date.now() - sessionCacheAtMs;
    const hasFreshCache =
      sessionCachedShows !== null && cacheAgeMs >= 0 && cacheAgeMs < SESSION_CACHE_TTL_MS;

    if (hasFreshCache && sessionCachedShows) {
      setShows(sessionCachedShows);
      setIsLoading(false);
      void reload({ silent: true });
      return;
    }

    if (sessionCachedShows) {
      setShows(sessionCachedShows);
    }

    void reload({ silent: Boolean(sessionCachedShows) });
  }, [enabled, reload]);

  return {
    shows,
    isLoading,
    error,
    reload: () => reload(),
  };
}
