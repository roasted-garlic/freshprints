export function clearOwnedFlushTimers<T>(
  timers: Map<string, T>,
  clearTimer: (timer: T) => void,
): void {
  for (const timer of timers.values()) {
    clearTimer(timer);
  }
  timers.clear();
}
