const TTL_MS = 30_000;
const MAX_ENTRIES = 200;

interface ResolvedEntry {
  expiresAtMs: number;
  value: unknown;
}

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

export async function loadPortalPrintRequestReadCached<T>(
  key: string,
  load: () => Promise<T>,
): Promise<T> {
  const cached = resolved.get(key);
  if (cached && cached.expiresAtMs > Date.now()) {
    touch(key, cached);
    return cached.value as T;
  }
  if (cached) resolved.delete(key);

  const active = inflight.get(key);
  if (active) return active as Promise<T>;

  const request = load();
  const requestGeneration = generation;
  inflight.set(key, request);
  try {
    const value = await request;
    if (requestGeneration === generation) {
      touch(key, { expiresAtMs: Date.now() + TTL_MS, value });
      trim();
    }
    return value;
  } finally {
    // Rejections are deliberately never retained.
    if (inflight.get(key) === request) {
      inflight.delete(key);
    }
  }
}

export function primePortalPrintRequestReadCache<T>(key: string, value: T): void {
  touch(key, { expiresAtMs: Date.now() + TTL_MS, value });
  trim();
}

export function clearPortalPrintRequestReadCache(): void {
  generation += 1;
  resolved.clear();
  inflight.clear();
}
