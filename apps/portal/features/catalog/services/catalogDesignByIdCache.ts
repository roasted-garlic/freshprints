import type { CatalogDesign } from '../types/catalog.types';

const TTL_MS = 5 * 60_000;
const MAX_ENTRIES = 250;

type CacheValue = CatalogDesign | null;
const resolved = new Map<string, { expiresAtMs: number; value: CacheValue }>();
const inflight = new Map<string, Promise<CacheValue>>();

function setResolved(id: string, value: CacheValue): void {
  resolved.delete(id);
  resolved.set(id, { expiresAtMs: Date.now() + TTL_MS, value });
  while (resolved.size > MAX_ENTRIES) {
    const oldest = resolved.keys().next().value as string | undefined;
    if (!oldest) break;
    resolved.delete(oldest);
  }
}

export async function loadCatalogDesignByIdCached(
  id: string,
  load: () => Promise<CacheValue>,
): Promise<CacheValue> {
  const cached = resolved.get(id);
  if (cached && cached.expiresAtMs > Date.now()) {
    resolved.delete(id);
    resolved.set(id, cached);
    return cached.value;
  }
  if (cached) resolved.delete(id);
  const active = inflight.get(id);
  if (active) return active;
  const request = load();
  inflight.set(id, request);
  try {
    const value = await request;
    setResolved(id, value);
    return value;
  } finally {
    inflight.delete(id);
  }
}

export function invalidateCatalogDesignById(id: string): void {
  resolved.delete(id.trim());
}

export function clearCatalogDesignByIdCache(): void {
  resolved.clear();
  inflight.clear();
}
