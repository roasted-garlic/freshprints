'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { PortalShowPrintProgress } from '@fresh-prints/shared/types/portal/getPortalShowPrintProgress.types';
import {
  computeElapsedPrintMs,
  formatPrintElapsed,
  isShowPrintTimerPaused,
} from '@fresh-prints/shared/utils/showPrintTimer';

import { portalShowSelectionService } from '../services/portalShowSelectionService';
import {
  portalPrintProgressPollDelay,
  shouldPollPortalPrintProgress,
} from '../utils/portalPrintProgressPolling';
import { buildPortalShowPrintProgressSignature } from '../utils/portalShowPrintProgressSignature';
import { PortalProgressRequestGate } from '../utils/portalProgressRequestGate';
import { PortalProgressPollingController } from '../utils/portalProgressPollingController';

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
  const [isDocumentVisible, setIsDocumentVisible] = useState(
    () => typeof document === 'undefined' || document.visibilityState === 'visible',
  );
  const progressSignatureRef = useRef('');
  const unchangedPollsRef = useRef(0);
  const requestGateRef = useRef(new PortalProgressRequestGate());

  useEffect(() => {
    const gate = requestGateRef.current;
    gate.invalidate();
    return () => gate.invalidate();
  }, [enabled, printRequestId]);

  const loadProgress = useCallback(async () => {
    if (!printRequestId || !enabled) {
      setShows([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    return requestGateRef.current.run(
      () => portalShowSelectionService.getShowPrintProgress(printRequestId),
      (nextShows) => {
      const signature = buildPortalShowPrintProgressSignature(nextShows);
      unchangedPollsRef.current =
        signature === progressSignatureRef.current ? unchangedPollsRef.current + 1 : 0;
      progressSignatureRef.current = signature;
      setShows(nextShows);
      setError(null);
      setNowMs(Date.now());
      },
      (loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load print progress.');
        setShows([]);
      },
      () => setIsLoading(true),
      () => setIsLoading(false),
    );
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
  const primaryProductionStatus = primaryShow?.productionStatus;
  const isTerminal = Boolean(
    primaryShow &&
      (primaryShow.productionStatus === 'completed' ||
        primaryShow.productionStatus === 'fully_printed'),
  );

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
    if (!shouldPollPortalPrintProgress({
      enabled,
      isDocumentVisible,
      printRequestId,
      productionStatus: primaryProductionStatus,
    })) {
      return;
    }

    const controller = new PortalProgressPollingController(
      loadProgress,
      () => portalPrintProgressPollDelay(unchangedPollsRef.current),
      {
        setTimeout: (callback, delayMs) => window.setTimeout(callback, delayMs),
        clearTimeout: (handle) => window.clearTimeout(handle as number),
      },
    );
    controller.start();

    const handleFocus = () => {
      void controller.refreshNow();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      controller.stop();
      window.removeEventListener('focus', handleFocus);
    };
  }, [
    enabled,
    isDocumentVisible,
    isTerminal,
    loadProgress,
    primaryProductionStatus,
    printRequestId,
  ]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      setIsDocumentVisible(visible);
      if (visible && enabled && printRequestId && !isTerminal) void loadProgress();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [enabled, isTerminal, loadProgress, printRequestId]);

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
    shows,
    statusHeadline,
  };
}
