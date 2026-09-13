'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { PortalAdminUpcomingShowQueueDashboardResponse } from '@fresh-prints/shared/types/portal/getPortalAdminUpcomingShowQueueDashboard.types';

import { useAuth } from '../../auth/context/AuthContext';
import { portalAdminShowQueueService } from '../services/portalAdminShowQueueService';
import {
  armPortalAdminShowQueueMount,
  refreshPortalAdminShowQueue,
} from './portalAdminShowQueueLoad';

export function usePortalAdminShowQueue() {
  const { bootstrapStatus } = useAuth();
  const isAdminSession = bootstrapStatus === 'portal-admin';
  const [data, setData] = useState<PortalAdminUpcomingShowQueueDashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedShowId, setSelectedShowId] = useState<string | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const mountedRef = useRef(true);
  const selectedShowIdRef = useRef<string | null>(null);
  // Keep visited show responses local to this page. Manual Refresh still bypasses this cache.
  const dashboardCacheRef = useRef(
    new Map<string, PortalAdminUpcomingShowQueueDashboardResponse>(),
  );

  useEffect(() => {
    return armPortalAdminShowQueueMount(mountedRef);
  }, []);

  useEffect(() => {
    selectedShowIdRef.current = selectedShowId;
  }, [selectedShowId]);

  const refresh = useCallback((): Promise<void> => {
    const requestedShowId = selectedShowIdRef.current;
    return refreshPortalAdminShowQueue({
      isAdminSession,
      inFlightRef,
      mountedRef,
      load: async () => {
        const response = await portalAdminShowQueueService.loadDashboard(
          requestedShowId ? { showId: requestedShowId } : {},
        );
        dashboardCacheRef.current.set(response.selectedShowId ?? '__empty__', response);
        if (mountedRef.current && selectedShowIdRef.current === requestedShowId) {
          setSelectedShowId(response.selectedShowId);
        }
        return response;
      },
      setData: (nextData) => {
        if (!mountedRef.current) {
          return;
        }
        const responseShowId = nextData?.selectedShowId ?? '__empty__';
        if (selectedShowIdRef.current === requestedShowId && (requestedShowId === null || responseShowId === requestedShowId)) {
          setData(nextData);
        }
      },
      setError,
      setIsLoading,
    });
  }, [isAdminSession]);

  const selectShow = useCallback(
    async (showId: string): Promise<void> => {
      if (!isAdminSession || !showId || showId === selectedShowIdRef.current) {
        return;
      }
      selectedShowIdRef.current = showId;
      setSelectedShowId(showId);
      const cached = dashboardCacheRef.current.get(showId);
      if (cached) {
        setData(cached);
        setError(null);
        setIsLoading(false);
        return;
      }

      const inFlight = inFlightRef.current;
      if (inFlight) {
        await inFlight;
        if (!mountedRef.current || selectedShowIdRef.current !== showId) {
          return;
        }
        const cachedAfterWait = dashboardCacheRef.current.get(showId);
        if (cachedAfterWait) {
          setData(cachedAfterWait);
          setError(null);
          setIsLoading(false);
          return;
        }
      }

      await refreshPortalAdminShowQueue({
        isAdminSession,
        inFlightRef,
        mountedRef,
        load: async () => {
          const response = await portalAdminShowQueueService.loadDashboard({ showId });
          dashboardCacheRef.current.set(response.selectedShowId ?? '__empty__', response);
          if (mountedRef.current && selectedShowIdRef.current === showId) {
            setSelectedShowId(response.selectedShowId);
          }
          return response;
        },
        setData: (nextData) => {
          if (mountedRef.current && selectedShowIdRef.current === showId) {
            setData(nextData);
          }
        },
        setError,
        setIsLoading,
      });
    },
    [isAdminSession],
  );

  useEffect(() => {
    if (!isAdminSession) {
      setData(null);
      setError(null);
      setIsLoading(false);
      setSelectedShowId(null);
      selectedShowIdRef.current = null;
      dashboardCacheRef.current.clear();
      return;
    }
    void refresh();
  }, [isAdminSession, refresh]);

  return {
    data,
    error,
    isLoading,
    selectedShowId,
    refresh,
    selectShow,
  };
}
