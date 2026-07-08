import { useCallback, useEffect, useMemo, useState } from "react";

import {
  computeElapsedPrintMs,
  formatPrintElapsed,
  isShowPrintTimerPaused,
} from "@fresh-prints/shared/utils/showPrintTimer";
import type { UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";

import { useAuth } from "../../auth/hooks/useAuth";
import { isPastScheduledShow as isShowPastScheduled } from "../utils/groupShowsByUpcomingPast";
import { upcomingShowService } from "../services/upcomingShowService";

interface UseShowProductionTimerOptions {
  show: UpcomingShow | null;
  hasActiveAllocations: boolean;
  onShowUpdated?: () => void | Promise<void>;
}

export function useShowProductionTimer({
  show,
  hasActiveAllocations,
  onShowUpdated,
}: UseShowProductionTimerOptions) {
  const { user } = useAuth();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isActionPending, setIsActionPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isPrinting = show?.productionStatus === "printing";
  const isFinished = show?.productionStatus === "completed" || show?.productionStatus === "fully_printed";
  const isPaused = show
    ? isShowPrintTimerPaused({
        productionStatus: show.productionStatus,
        activePrintStartedAtMs: show.activePrintStartedAt?.toMillis(),
        printPausedAtMs: show.printPausedAt?.toMillis(),
      })
    : false;

  useEffect(() => {
    if (!isPrinting || isPaused) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isPaused, isPrinting]);

  const elapsedMs = useMemo(() => {
    if (!show) {
      return 0;
    }

    return computeElapsedPrintMs({
      accumulatedPrintMs: show.accumulatedPrintMs,
      activePrintStartedAtMs: show.activePrintStartedAt?.toMillis(),
      nowMs,
    });
  }, [nowMs, show]);

  const formattedElapsed = formatPrintElapsed(elapsedMs);

  const isPastScheduledShow = show ? isShowPastScheduled(show, new Date()) : false;
  const canStart = Boolean(
    show &&
      hasActiveAllocations &&
      !isPastScheduledShow &&
      (show.productionStatus === "open" || show.productionStatus === "full"),
  );
  const canPause = Boolean(show && isPrinting && !isPaused && !isPastScheduledShow);
  const canResume = Boolean(show && isPaused && !isPastScheduledShow);
  const canMarkFinished = Boolean(show && isPrinting && !isPastScheduledShow);

  const runAction = useCallback(
    async (action: (showId: string) => Promise<UpcomingShow>) => {
      if (!user || !show) {
        return;
      }

      setIsActionPending(true);
      setActionError(null);

      try {
        await action(show.id);
        await onShowUpdated?.();
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Unable to update show printing.");
      } finally {
        setIsActionPending(false);
      }
    },
    [onShowUpdated, show, user],
  );

  return {
    formattedElapsed,
    elapsedMs,
    isPrinting,
    isPaused,
    isFinished,
    isPastScheduledShow,
    isActionPending,
    actionError,
    canStart,
    canPause,
    canResume,
    canMarkFinished,
    startPrinting: () => runAction((showId) => upcomingShowService.startShowPrinting(user!, showId)),
    pausePrinting: () => runAction((showId) => upcomingShowService.pauseShowPrinting(user!, showId)),
    resumePrinting: () => runAction((showId) => upcomingShowService.resumeShowPrinting(user!, showId)),
    markFinished: () => runAction((showId) => upcomingShowService.markShowPrintingFinished(user!, showId)),
  };
}
