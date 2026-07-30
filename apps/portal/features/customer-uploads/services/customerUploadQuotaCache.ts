const QUOTA_CACHE_MS = 45_000;
const entries = new Map<string, { value?: unknown; loadedAtMs: number; pending?: Promise<unknown> }>();

export async function loadCustomerUploadQuotaCached<T>(
  key: string,
  load: () => Promise<T>,
  nowMs = Date.now(),
): Promise<T> {
  const entry = entries.get(key);
  if (entry?.pending) return entry.pending as Promise<T>;
  if (entry?.value !== undefined && nowMs - entry.loadedAtMs < QUOTA_CACHE_MS) {
    return entry.value as T;
  }
  const pending = load()
    .then((value) => {
      entries.set(key, { value, loadedAtMs: Date.now() });
      return value;
    })
    .catch((error) => {
      entries.delete(key);
      throw error;
    });
  entries.set(key, { value: entry?.value, loadedAtMs: entry?.loadedAtMs ?? 0, pending });
  return pending;
}

export function invalidateCustomerUploadQuota(keyPrefix?: string): void {
  if (!keyPrefix) {
    entries.clear();
    return;
  }
  for (const key of entries.keys()) {
    if (key.startsWith(keyPrefix)) entries.delete(key);
  }
}
