/**
 * Pure aggregation for bounded Smart Profile vocabulary snapshots.
 * Counts tokens from existing profiles; no curated seed / synonym lists.
 */

import type { SmartProfileDimensionLists } from "../types/catalog/smartProfile.types";
import {
  SMART_PROFILE_VOCAB_AGGREGATE_DIMENSIONS,
  SMART_PROFILE_VOCAB_SAMPLE_LIMIT_DEFAULT,
  SMART_PROFILE_VOCAB_TOP_N_DEFAULT,
  takeTopNFromCounts,
  type SmartProfileVocabAggregateDim,
  type SmartProfileVocabLists,
} from "./smartProfileVocab";

export type SmartProfileVocabCountMaps = Record<
  SmartProfileVocabAggregateDim,
  Record<string, number>
>;

export function createEmptySmartProfileVocabCountMaps(): SmartProfileVocabCountMaps {
  const maps = {} as SmartProfileVocabCountMaps;
  for (const dim of SMART_PROFILE_VOCAB_AGGREGATE_DIMENSIONS) {
    maps[dim] = {};
  }
  return maps;
}

function bumpCount(counts: Record<string, number>, raw: string): void {
  const trimmed = raw.trim();
  if (!trimmed) {
    return;
  }
  counts[trimmed] = (counts[trimmed] ?? 0) + 1;
}

/** Fold one profile's list dims into frequency maps (display strings as stored). */
export function accumulateSmartProfileVocabCounts(
  maps: SmartProfileVocabCountMaps,
  profile: SmartProfileDimensionLists | null | undefined,
): void {
  if (!profile) {
    return;
  }

  for (const dim of SMART_PROFILE_VOCAB_AGGREGATE_DIMENSIONS) {
    const values = profile[dim];
    if (!Array.isArray(values)) {
      continue;
    }
    for (const value of values) {
      if (typeof value === "string") {
        bumpCount(maps[dim], value);
      }
    }
  }
}

export function listsFromSmartProfileVocabCounts(
  maps: SmartProfileVocabCountMaps,
  topN: number = SMART_PROFILE_VOCAB_TOP_N_DEFAULT,
): SmartProfileVocabLists {
  const lists: SmartProfileVocabLists = {};
  for (const dim of SMART_PROFILE_VOCAB_AGGREGATE_DIMENSIONS) {
    const top = takeTopNFromCounts(maps[dim], topN);
    if (top.length > 0) {
      lists[dim] = top;
    }
  }
  return lists;
}

export function aggregateSmartProfileVocabFromProfiles(
  profiles: ReadonlyArray<SmartProfileDimensionLists | null | undefined>,
  options?: { topN?: number; sampleLimit?: number },
): {
  lists: SmartProfileVocabLists;
  sampleSize: number;
  sampleLimit: number;
  topN: number;
} {
  const topN =
    typeof options?.topN === "number" && options.topN > 0
      ? Math.floor(options.topN)
      : SMART_PROFILE_VOCAB_TOP_N_DEFAULT;
  const sampleLimit =
    typeof options?.sampleLimit === "number" && options.sampleLimit > 0
      ? Math.floor(options.sampleLimit)
      : SMART_PROFILE_VOCAB_SAMPLE_LIMIT_DEFAULT;

  const maps = createEmptySmartProfileVocabCountMaps();
  let sampleSize = 0;
  for (const profile of profiles) {
    if (sampleSize >= sampleLimit) {
      break;
    }
    if (!profile) {
      continue;
    }
    accumulateSmartProfileVocabCounts(maps, profile);
    sampleSize += 1;
  }

  return {
    lists: listsFromSmartProfileVocabCounts(maps, topN),
    sampleSize,
    sampleLimit,
    topN,
  };
}

export function smartProfileVocabListsHaveValues(
  lists: SmartProfileVocabLists | undefined,
): boolean {
  if (!lists) {
    return false;
  }
  return SMART_PROFILE_VOCAB_AGGREGATE_DIMENSIONS.some((dim) => {
    const values = lists[dim];
    return Array.isArray(values) && values.length > 0;
  });
}