/**
 * Bounded auto-derived Smart Profile vocab snapshot.
 * Populated by `refreshSmartProfileVocabSnapshot` (scheduled / callable / throttled after enrichment).
 * Optional Firestore doc — empty when missing. Not owner-maintained seed lists.
 * Does not call Algolia from the enrichment hot path (keeps ALGOLIA_ADMIN_API_KEY off enqueueAiEnrichment).
 */

import { adminDb } from "../lib/admin";
import {
  SMART_PROFILE_VOCAB_FACETABLE_DIMENSIONS,
  SMART_PROFILE_VOCAB_TOP_N_DEFAULT,
  type SmartProfileVocabLists,
} from "../../../packages/shared/src/utils/smartProfileVocab";

const VOCAB_DOC_PATH = "settings/aiSmartProfileVocab";

export type SmartProfileVocabSnapshot = {
  lists: SmartProfileVocabLists;
  source: "firestore" | "empty";
  loadedAtMs: number;
};

let cached: SmartProfileVocabSnapshot | null = null;
let inflight: Promise<SmartProfileVocabSnapshot> | null = null;
const TTL_MS = 10 * 60 * 1000;

function coerceStringList(value: unknown, maxItems: number): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const result: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }
    const trimmed = item.trim();
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(trimmed);
    if (result.length >= maxItems) {
      break;
    }
  }
  return result.length > 0 ? result : undefined;
}

function parseVocabDocument(data: Record<string, unknown> | undefined): SmartProfileVocabLists {
  if (!data || typeof data !== "object") {
    return {};
  }

  const lists: SmartProfileVocabLists = {};
  const topN =
    typeof data.topN === "number" && data.topN > 0
      ? Math.min(Math.floor(data.topN), SMART_PROFILE_VOCAB_TOP_N_DEFAULT)
      : SMART_PROFILE_VOCAB_TOP_N_DEFAULT;

  for (const dim of SMART_PROFILE_VOCAB_FACETABLE_DIMENSIONS) {
    const values = coerceStringList(data[dim], topN);
    if (values) {
      lists[dim] = values;
    }
  }

  const objects = coerceStringList(data.objects, topN);
  if (objects) {
    lists.objects = objects;
  }

  return lists;
}

async function fetchSnapshot(): Promise<SmartProfileVocabSnapshot> {
  try {
    const snap = await adminDb.doc(VOCAB_DOC_PATH).get();
    if (!snap.exists) {
      return { lists: {}, source: "empty", loadedAtMs: Date.now() };
    }
    return {
      lists: parseVocabDocument(snap.data() as Record<string, unknown> | undefined),
      source: "firestore",
      loadedAtMs: Date.now(),
    };
  } catch {
    return { lists: {}, source: "empty", loadedAtMs: Date.now() };
  }
}

export async function loadSmartProfileVocabSnapshot(options?: {
  forceRefresh?: boolean;
}): Promise<SmartProfileVocabSnapshot> {
  const now = Date.now();
  if (
    !options?.forceRefresh &&
    cached &&
    now - cached.loadedAtMs < TTL_MS
  ) {
    return cached;
  }

  if (!options?.forceRefresh && inflight) {
    return inflight;
  }

  inflight = fetchSnapshot().then((value) => {
    cached = value;
    inflight = null;
    return value;
  });

  return inflight;
}

/** Clears process cache after snapshot writes (also used in tests). */
export function invalidateSmartProfileVocabSnapshotCache(): void {
  cached = null;
  inflight = null;
}

/** @deprecated Prefer invalidateSmartProfileVocabSnapshotCache */
export function clearSmartProfileVocabSnapshotCacheForTests(): void {
  invalidateSmartProfileVocabSnapshotCache();
}
