const inFlightSubmissions = new Map<string, Promise<unknown>>();

export function sharePortalShowQueueSubmission<T>(
  key: string,
  submit: () => Promise<T>,
): Promise<T> {
  const existing = inFlightSubmissions.get(key) as Promise<T> | undefined;
  if (existing) {
    return existing;
  }

  const pending = submit().finally(() => {
    if (inFlightSubmissions.get(key) === pending) {
      inFlightSubmissions.delete(key);
    }
  });
  inFlightSubmissions.set(key, pending);
  return pending;
}

export function clearPortalShowQueueSubmissionsForTests(): void {
  inFlightSubmissions.clear();
}
