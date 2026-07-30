const TTL_MS = 30_000;
const MAX_ENTRIES = 200;

interface ResolvedEntry {
  expiresAtMs: number;
  value: unknown;
}

/**
 * Auth-scoped remount cache for the Print Requests page's bounded hydration (list pages, exact
 * counts, chunked summaries/customers/allocations/shows) — returning to `/print-requests` within
 * the valid session reuses these instead of repeating cold-mount reads (Wave C hydration
 * remediation, 2026-07-25). Keys are always prefixed with the caller's own uid, so no cross-user
 * leakage is possible even though the cache is a shared module singleton.
 */
const resolved = new Map<string, ResolvedEntry>();
const inflight = new Map<string, Promise<unknown>>();
let generation = 0;

function touch(key: string, entry: ResolvedEntry): void {
  resolved.delete(key);
  resolved.set(key, entry);
}

function trim(): void {
  while (resolved.size > MAX_ENTRIES) {
    const oldest = resolved.keys().next().value as string | undefined;
    if (!oldest) return;
    resolved.delete(oldest);
  }
}

function scopedKey(userId: string, key: string): string {
  return `${userId}:${key}`;
}

export async function loadPrintRequestsPageCached<T>(
  userId: string,
  key: string,
  load: () => Promise<T>,
): Promise<T> {
  const scoped = scopedKey(userId, key);
  const cached = resolved.get(scoped);
  if (cached && cached.expiresAtMs > Date.now()) {
    touch(scoped, cached);
    return cached.value as T;
  }
  if (cached) resolved.delete(scoped);

  const active = inflight.get(scoped);
  if (active) return active as Promise<T>;

  const request = load();
  const requestGeneration = generation;
  inflight.set(scoped, request);
  try {
    const value = await request;
    if (requestGeneration === generation) {
      touch(scoped, { expiresAtMs: Date.now() + TTL_MS, value });
      trim();
    }
    return value;
  } finally {
    // Rejections are deliberately never retained — a failed load must not poison the cache.
    if (inflight.get(scoped) === request) {
      inflight.delete(scoped);
    }
  }
}

export function primePrintRequestsPageCache<T>(userId: string, key: string, value: T): void {
  touch(scopedKey(userId, key), { expiresAtMs: Date.now() + TTL_MS, value });
  trim();
}

export function invalidatePrintRequestsPageCache(userId: string, keyPrefix?: string): void {
  if (!keyPrefix) {
    // Auth change: clear everything, not just this user's entries — bounded memory, simplest
    // correct behavior on sign-out/sign-in.
    generation += 1;
    resolved.clear();
    inflight.clear();
    return;
  }
  const prefix = scopedKey(userId, keyPrefix);
  for (const key of [...resolved.keys()]) {
    if (key.startsWith(prefix)) resolved.delete(key);
  }
  for (const key of [...inflight.keys()]) {
    if (key.startsWith(prefix)) inflight.delete(key);
  }
}

/** Full reset — call on auth/user change. */
export function clearPrintRequestsPageCache(): void {
  generation += 1;
  resolved.clear();
  inflight.clear();
}
