'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { PortalShowPrintProgress } from '@fresh-prints/shared/types/portal/getPortalShowPrintProgress.types';
import {
  computeElapsedPrintMs,
  formatPrintElapsed,
  isShowPrintTimerPaused,
} from '@fresh-prints/shared/utils/showPrintTimer';

import { portalShowSelectionService } from '../services/portalShowSelectionService';

const RESYNC_INTERVAL_MS = 30_000;

function pickPrimaryShow(shows: PortalShowPrintProgress[]): PortalShowPrintProgress | null {
  if (shows.length === 0) {
    return null;
  }

  const printing = shows.find((show) => show.productionStatus === 'printing');
  if (printing) {
    return printing;
  }

  const finished = shows.find(
    (show) => show.productionStatus === 'completed' || show.productionStatus === 'fully_printed',
  );
  if (finished) {
    return finished;
  }

  return shows[0] ?? null;
}

export function usePortalShowPrintProgress(printRequestId: string | undefined, enabled: boolean) {
  const [shows, setShows] = useState<PortalShowPrintProgress[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const loadProgress = useCallback(async () => {
    if (!printRequestId || !enabled) {
      setShows([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const nextShows = await portalShowSelectionService.getShowPrintProgress(printRequestId);
      setShows(nextShows);
      setError(null);
      setNowMs(Date.now());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load print progress.');
      setShows([]);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, printRequestId]);

  useEffect(() => {
    void loadProgress();
  }, [loadProgress]);

  const primaryShow = useMemo(() => pickPrimaryShow(shows), [shows]);

  const isPaused = primaryShow
    ? isShowPrintTimerPaused({
        productionStatus: primaryShow.productionStatus,
        activePrintStartedAtMs: primaryShow.activePrintStartedAtMs ?? undefined,
        printPausedAtMs: primaryShow.printPausedAtMs ?? undefined,
      })
    : false;

  const isRunning =
    primaryShow?.productionStatus === 'printing' &&
    primaryShow.activePrintStartedAtMs !== null &&
    !isPaused;

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isRunning]);

  useEffect(() => {
    if (!enabled || !printRequestId) {
      return;
    }

    const resyncId = window.setInterval(() => {
      void loadProgress();
    }, RESYNC_INTERVAL_MS);

    const handleFocus = () => {
      void loadProgress();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.clearInterval(resyncId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [enabled, loadProgress, printRequestId]);

  const elapsedMs = primaryShow
    ? computeElapsedPrintMs({
        accumulatedPrintMs: primaryShow.accumulatedPrintMs,
        activePrintStartedAtMs: primaryShow.activePrintStartedAtMs ?? undefined,
        nowMs,
      })
    : 0;

  const formattedElapsed = formatPrintElapsed(elapsedMs);

  const statusHeadline = useMemo(() => {
    if (!primaryShow) {
      if (isLoading) {
        return 'Loading printer status';
      }
      if (error) {
        return 'Printer timer unavailable';
      }
      return 'Waiting for printing to start';
    }

    if (primaryShow.productionStatus === 'completed' || primaryShow.productionStatus === 'fully_printed') {
      return 'Finished';
    }

    if (isPaused) {
      return 'Paused';
    }

    if (isRunning) {
      return 'Printer running';
    }

    if (primaryShow.productionStatus === 'printing') {
      return 'Printing';
    }

    return 'Waiting for printing to start';
  }, [error, isLoading, isPaused, isRunning, primaryShow]);

  const showElapsed =
    Boolean(primaryShow) &&
    (isRunning ||
      isPaused ||
      primaryShow?.productionStatus === 'printing' ||
      primaryShow?.productionStatus === 'completed' ||
      primaryShow?.productionStatus === 'fully_printed');

  return {
    error,
    formattedElapsed,
    isLoading,
    isPaused,
    isRunning,
    primaryShow,
    reload: loadProgress,
    showElapsed,
    statusHeadline,
  };
}
