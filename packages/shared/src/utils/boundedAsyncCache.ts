export interface BoundedAsyncCacheOptions {
  maxEntries: number;
  onEvent?: (event: "hit" | "miss" | "retry", key: string) => void;
  ttlMs: number;
}

interface ResolvedEntry<T> {
  expiresAt: number;
  value: T;
}

export interface BoundedAsyncCache<T> {
  clear: () => void;
  get: (key: string, loader: () => Promise<T>) => Promise<T>;
  invalidate: (key?: string) => void;
  size: () => { inFlight: number; resolved: number };
}

/**
 * Small service-layer cache for idempotent reads.
 *
 * Concurrent callers share one Promise. Rejections are never retained. Resolved values use
 * insertion-order LRU eviction and a bounded TTL; callers must explicitly invalidate after writes.
 */
export function createBoundedAsyncCache<T>(
  options: BoundedAsyncCacheOptions,
): BoundedAsyncCache<T> {
  if (!Number.isInteger(options.maxEntries) || options.maxEntries < 1) {
    throw new Error("maxEntries must be a positive integer.");
  }
  if (!Number.isFinite(options.ttlMs) || options.ttlMs < 0) {
    throw new Error("ttlMs must be a non-negative number.");
  }

  const resolved = new Map<string, ResolvedEntry<T>>();
  const inFlight = new Map<string, Promise<T>>();
  const failed = new Set<string>();

  const trim = () => {
    while (resolved.size > options.maxEntries) {
      const oldestKey = resolved.keys().next().value as string | undefined;
      if (oldestKey === undefined) {
        return;
      }
      resolved.delete(oldestKey);
    }
  };

  return {
    clear() {
      resolved.clear();
      inFlight.clear();
      failed.clear();
    },
    get(key, loader) {
      const now = Date.now();
      const cached = resolved.get(key);
      if (cached && cached.expiresAt > now) {
        resolved.delete(key);
        resolved.set(key, cached);
        options.onEvent?.("hit", key);
        return Promise.resolve(cached.value);
      }
      if (cached) {
        resolved.delete(key);
      }

      const pending = inFlight.get(key);
      if (pending) {
        options.onEvent?.("hit", key);
        return pending;
      }

      options.onEvent?.(failed.has(key) ? "retry" : "miss", key);
      failed.delete(key);
      const next = loader()
        .then((value) => {
          resolved.set(key, { expiresAt: Date.now() + options.ttlMs, value });
          trim();
          return value;
        })
        .catch((error: unknown) => {
          failed.add(key);
          throw error;
        })
        .finally(() => {
          inFlight.delete(key);
        });
      inFlight.set(key, next);
      return next;
    },
    invalidate(key) {
      if (key === undefined) {
        resolved.clear();
        failed.clear();
        return;
      }
      resolved.delete(key);
      failed.delete(key);
    },
    size() {
      return { inFlight: inFlight.size, resolved: resolved.size };
    },
  };
}
