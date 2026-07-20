'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { PortalAllocatableShow } from '@fresh-prints/shared/types/portal/listPortalAllocatableShows.types';
import { DEFAULT_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START } from '@fresh-prints/shared/utils/showQueueCutoff';

import { portalShowSelectionService } from '../services/portalShowSelectionService';

/** Keep last successful list warm across modal open/close in the same session. */
let sessionCachedShows: PortalAllocatableShow[] | null = null;
let sessionCachedCutoffHours = DEFAULT_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START;
let sessionCacheAtMs = 0;
const SESSION_CACHE_TTL_MS = 60_000;

export function usePortalAllocatableShows(enabled: boolean) {
  const [shows, setShows] = useState<PortalAllocatableShow[]>(() => sessionCachedShows ?? []);
  const [portalQueueCutoffHoursBeforeStart, setPortalQueueCutoffHoursBeforeStart] = useState(
    () => sessionCachedCutoffHours,
  );
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
      const result = await portalShowSelectionService.listAllocatableShows();
      if (requestId !== requestIdRef.current) {
        return;
      }
      sessionCachedShows = result.shows;
      sessionCachedCutoffHours = result.portalQueueCutoffHoursBeforeStart;
      sessionCacheAtMs = Date.now();
      setShows(result.shows);
      setPortalQueueCutoffHoursBeforeStart(result.portalQueueCutoffHoursBeforeStart);
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
      setPortalQueueCutoffHoursBeforeStart(sessionCachedCutoffHours);
      setIsLoading(false);
      void reload({ silent: true });
      return;
    }

    if (sessionCachedShows) {
      setShows(sessionCachedShows);
      setPortalQueueCutoffHoursBeforeStart(sessionCachedCutoffHours);
    }

    void reload({ silent: Boolean(sessionCachedShows) });
  }, [enabled, reload]);

  return {
    shows,
    portalQueueCutoffHoursBeforeStart,
    isLoading,
    error,
    reload: () => reload(),
  };
}
