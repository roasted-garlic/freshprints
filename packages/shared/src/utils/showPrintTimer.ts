export interface ShowPrintTimerSnapshot {
  accumulatedPrintMs: number;
  activePrintStartedAtMs?: number;
  nowMs: number;
}

/**
 * Total elapsed print time for a show, including the current running segment when not paused.
 */
export function computeElapsedPrintMs(snapshot: ShowPrintTimerSnapshot): number {
  const base = Math.max(0, snapshot.accumulatedPrintMs);

  if (snapshot.activePrintStartedAtMs === undefined) {
    return base;
  }

  const runningMs = Math.max(0, snapshot.nowMs - snapshot.activePrintStartedAtMs);
  return base + runningMs;
}

export function formatPrintElapsed(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (value: number) => String(value).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }

  return `${minutes}:${pad(seconds)}`;
}

export function isShowPrintTimerPaused(input: {
  productionStatus: string;
  activePrintStartedAtMs?: number;
  printPausedAtMs?: number;
}): boolean {
  return input.productionStatus === "printing" && input.printPausedAtMs !== undefined && input.activePrintStartedAtMs === undefined;
}
