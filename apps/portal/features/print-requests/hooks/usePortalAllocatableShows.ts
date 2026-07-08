'use client';

import { useCallback, useEffect, useState } from 'react';

import type { PortalAllocatableShow } from '@fresh-prints/shared/types/portal/listPortalAllocatableShows.types';

import { portalShowSelectionService } from '../services/portalShowSelectionService';

export function usePortalAllocatableShows(enabled: boolean) {
  const [shows, setShows] = useState<PortalAllocatableShow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setShows([]);

    try {
      const nextShows = await portalShowSelectionService.listAllocatableShows();
      setShows(nextShows);
    } catch (loadError) {
      setShows([]);
      setError(loadError instanceof Error ? loadError.message : 'Unable to load shows.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setShows([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    void reload();
  }, [enabled, reload]);

  return {
    shows,
    isLoading,
    error,
    reload,
  };
}
