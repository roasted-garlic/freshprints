import type { ListPortalAllocatableShowsResponse } from '@fresh-prints/shared/types/portal/listPortalAllocatableShows.types';
import { DEFAULT_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START } from '@fresh-prints/shared/utils/showQueueCutoff';

const CACHE_TTL_MS = 60_000;

type CachedAllocatableShows = {
  portalQueueCutoffHoursBeforeStart: number;
  shows: ListPortalAllocatableShowsResponse['shows'];
};

let cachedResponse: CachedAllocatableShows | null = null;
let cachedAtMs = 0;
let inFlight: Promise<CachedAllocatableShows> | null = null;

export function clearPortalAllocatableShowsReadCache(): void {
  cachedResponse = null;
  cachedAtMs = 0;
  inFlight = null;
}

export async function readPortalAllocatableShowsCached(
  load: () => Promise<CachedAllocatableShows>,
): Promise<CachedAllocatableShows> {
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

export function getPortalAllocatableShowsSessionDefaults(): {
  portalQueueCutoffHoursBeforeStart: number;
  shows: ListPortalAllocatableShowsResponse['shows'];
} | null {
  return cachedResponse;
}

export function getPortalAllocatableShowsDefaultCutoffHours(): number {
  return cachedResponse?.portalQueueCutoffHoursBeforeStart ?? DEFAULT_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START;
}
