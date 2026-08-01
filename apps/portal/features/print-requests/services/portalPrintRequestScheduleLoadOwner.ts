const inFlightScheduleLoads = new Map<string, Promise<unknown>>();

export function sharePortalPrintRequestScheduleLoad<T>(
  printRequestIds: readonly string[],
  load: () => Promise<T>,
): Promise<T> {
  const key = [...printRequestIds].sort().join(":");
  const existing = inFlightScheduleLoads.get(key) as Promise<T> | undefined;
  if (existing) {
    return existing;
  }

  const pending = load().finally(() => {
    if (inFlightScheduleLoads.get(key) === pending) {
      inFlightScheduleLoads.delete(key);
    }
  });
  inFlightScheduleLoads.set(key, pending);
  return pending;
}

export function clearPortalPrintRequestScheduleLoadsForTests(): void {
  inFlightScheduleLoads.clear();
}
