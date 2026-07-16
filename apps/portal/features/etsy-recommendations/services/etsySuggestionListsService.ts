import { FirebaseError } from 'firebase/app';
import {
  collection,
  getDocs,
  query,
  where,
  type Unsubscribe,
  onSnapshot,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

import {
  ETSY_RECOMMENDATION_SUGGESTIONS_CLIENT_CACHE_TTL_MS,
  ETSY_RECOMMENDATION_SUGGESTIONS_COLLECTION,
  type EtsyRecommendationSuggestionKind,
} from '@fresh-prints/shared/constants/etsyRecommendation/etsyRecommendation.constants';
import type { AdminSuggestionOverlay } from '@fresh-prints/shared/constants/etsyRecommendation/etsyRecommendationSuggestionLists';
import type {
  AddEtsyRecommendationSuggestionRequest,
  AddEtsyRecommendationSuggestionResponse,
} from '@fresh-prints/shared/types/etsyRecommendation/etsyRecommendationActions.types';

import { getPortalDb, getPortalFunctions } from '../../../lib/firebase/client';

interface CacheEntry {
  overlays: AdminSuggestionOverlay[];
  fetchedAt: number;
}

let memoryCache: CacheEntry | null = null;
let inFlight: Promise<AdminSuggestionOverlay[]> | null = null;

function mapOverlayDoc(
  id: string,
  data: Record<string, unknown>,
): AdminSuggestionOverlay | null {
  const kind = data.kind;
  if (kind !== 'subject' && kind !== 'style') {
    return null;
  }
  if (typeof data.label !== 'string' || !data.label.trim()) {
    return null;
  }
  if (data.active !== true) {
    return null;
  }
  const label = data.label.trim();
  const apiToken =
    typeof data.apiToken === 'string' && data.apiToken.trim() ? data.apiToken.trim() : label;
  const labelKey =
    typeof data.labelKey === 'string' && data.labelKey.trim()
      ? data.labelKey.trim()
      : label.toLowerCase();
  const aliases = Array.isArray(data.aliases)
    ? data.aliases.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    : undefined;

  return {
    id,
    kind,
    label,
    apiToken,
    ...(aliases?.length ? { aliases } : {}),
    active: true,
    labelKey,
  };
}

async function fetchActiveOverlays(): Promise<AdminSuggestionOverlay[]> {
  const snapshot = await getDocs(
    query(
      collection(getPortalDb(), ETSY_RECOMMENDATION_SUGGESTIONS_COLLECTION),
      where('active', '==', true),
    ),
  );
  const overlays: AdminSuggestionOverlay[] = [];
  for (const docSnap of snapshot.docs) {
    const mapped = mapOverlayDoc(docSnap.id, docSnap.data() as Record<string, unknown>);
    if (mapped) {
      overlays.push(mapped);
    }
  }
  return overlays;
}

/**
 * Load active admin suggestion overlays with a short in-memory cache.
 * On failure, returns [] so the wizard can fall back to static seed only.
 */
export async function loadActiveEtsySuggestionOverlays(
  options?: { forceRefresh?: boolean },
): Promise<AdminSuggestionOverlay[]> {
  const now = Date.now();
  if (
    !options?.forceRefresh &&
    memoryCache &&
    now - memoryCache.fetchedAt < ETSY_RECOMMENDATION_SUGGESTIONS_CLIENT_CACHE_TTL_MS
  ) {
    return memoryCache.overlays;
  }
  if (!options?.forceRefresh && inFlight) {
    return inFlight;
  }

  inFlight = fetchActiveOverlays()
    .then((overlays) => {
      memoryCache = { overlays, fetchedAt: Date.now() };
      return overlays;
    })
    .catch(() => {
      // Keep wizard usable offline / on rules misdeploy.
      return memoryCache?.overlays ?? [];
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

export function filterOverlaysByKind(
  overlays: readonly AdminSuggestionOverlay[],
  kind: EtsyRecommendationSuggestionKind,
): AdminSuggestionOverlay[] {
  return overlays.filter((overlay) => overlay.kind === kind);
}

/** Studio-style live subscription helper (Portal uses cached get). */
function invalidateSuggestionCache(): void {
  memoryCache = null;
}

function mapCallableError(error: unknown): Error {
  if (error instanceof FirebaseError) {
    return error;
  }
  if (error instanceof Error) {
    return error;
  }
  return new Error('Unable to update Etsy suggestion lists.');
}

export async function addEtsyRecommendationSuggestion(
  input: AddEtsyRecommendationSuggestionRequest,
): Promise<AddEtsyRecommendationSuggestionResponse> {
  try {
    const callable = httpsCallable<
      AddEtsyRecommendationSuggestionRequest,
      AddEtsyRecommendationSuggestionResponse
    >(getPortalFunctions(), 'addEtsyRecommendationSuggestion');
    const response = await callable(input);
    invalidateSuggestionCache();
    return response.data;
  } catch (error) {
    throw mapCallableError(error);
  }
}

export function subscribeActiveEtsySuggestionOverlays(
  onChange: (overlays: AdminSuggestionOverlay[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(
      collection(getPortalDb(), ETSY_RECOMMENDATION_SUGGESTIONS_COLLECTION),
      where('active', '==', true),
    ),
    (snapshot) => {
      const overlays: AdminSuggestionOverlay[] = [];
      for (const docSnap of snapshot.docs) {
        const mapped = mapOverlayDoc(docSnap.id, docSnap.data() as Record<string, unknown>);
        if (mapped) {
          overlays.push(mapped);
        }
      }
      memoryCache = { overlays, fetchedAt: Date.now() };
      onChange(overlays);
    },
    (error) => {
      onError?.(error);
    },
  );
}
