import type { ListPortalShowCatalogDesignsResponse } from '@fresh-prints/shared/types/portal/listPortalShowCatalogDesigns.types';

const CACHE_TTL_MS = 60_000;

const cachedByShowId = new Map<string, ListPortalShowCatalogDesignsResponse>();
const cachedAtByShowId = new Map<string, number>();
const inFlightByShowId = new Map<string, Promise<ListPortalShowCatalogDesignsResponse>>();

export function clearPortalShowCatalogDesignsReadCache(): void {
  cachedByShowId.clear();
  cachedAtByShowId.clear();
  inFlightByShowId.clear();
}

export async function readPortalShowCatalogDesignsCached(
  showId: string,
  load: () => Promise<ListPortalShowCatalogDesignsResponse>,
): Promise<ListPortalShowCatalogDesignsResponse> {
  const trimmedShowId = showId.trim();
  if (!trimmedShowId) {
    return load();
  }

  const now = Date.now();
  const cachedAt = cachedAtByShowId.get(trimmedShowId) ?? 0;
  const cached = cachedByShowId.get(trimmedShowId);
  if (cached && now - cachedAt < CACHE_TTL_MS) {
    return cached;
  }

  const inFlight = inFlightByShowId.get(trimmedShowId);
  if (inFlight) {
    return inFlight;
  }

  const pending = load().then((response) => {
    cachedByShowId.set(trimmedShowId, response);
    cachedAtByShowId.set(trimmedShowId, Date.now());
    return response;
  });

  inFlightByShowId.set(trimmedShowId, pending);

  try {
    return await pending;
  } finally {
    inFlightByShowId.delete(trimmedShowId);
  }
}
