import type { ListPortalPublicShowsResponse } from '@fresh-prints/shared/types/portal/listPortalPublicShows.types';

const CACHE_TTL_MS = 60_000;

let cachedResponse: ListPortalPublicShowsResponse | null = null;
let cachedAtMs = 0;
let inFlight: Promise<ListPortalPublicShowsResponse> | null = null;

export function clearPortalPublicShowsReadCache(): void {
  cachedResponse = null;
  cachedAtMs = 0;
  inFlight = null;
}

export async function readPortalPublicShowsCached(
  load: () => Promise<ListPortalPublicShowsResponse>,
): Promise<ListPortalPublicShowsResponse> {
  const now = Date.now();
  if (cachedResponse && now - cachedAtMs < CACHE_TTL_MS) {
    return cachedResponse;
  }

  if (inFlight) {
    return inFlight;
  }

  inFlight = load().then((response) => {
    cachedResponse = response;
    cachedAtMs = Date.now();
    return response;
  });

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}
