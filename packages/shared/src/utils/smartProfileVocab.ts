/**
 * Bounded auto-derived Smart Profile vocabulary for prompt inject + post-gen exact match.
 * No manually curated seed lists. Novel concepts remain allowed when unmatched.
 */

import { PORTAL_CATALOG_ALGOLIA_SMART_FACET_ATTRIBUTES } from "../catalog-search/portalCatalogAlgoliaRecord";
import { buildSmartCanonicalVocabMap, type SmartCanonicalVocabMap } from "./smartCanonicalKey";
import type { SmartProfileDimensionVocab } from "./smartProfileNormalization";

/** Facetable dims may use Algolia top-N. objects/searchConcepts/visibleText are not facetable. */
export const SMART_PROFILE_VOCAB_FACETABLE_DIMENSIONS =
  PORTAL_CATALOG_ALGOLIA_SMART_FACET_ATTRIBUTES;

export const SMART_PROFILE_VOCAB_TOP_N_DEFAULT = 40;

/** Max designs sampled when refreshing the auto vocab snapshot (bounded, not full-catalog). */
export const SMART_PROFILE_VOCAB_SAMPLE_LIMIT_DEFAULT = 400;

/** Soft throttle for opportunistic refresh after enrichment writes. */
export const SMART_PROFILE_VOCAB_REFRESH_THROTTLE_MS = 60 * 60 * 1000;

/** Dimensions aggregated into the snapshot (facetable + objects). */
export const SMART_PROFILE_VOCAB_AGGREGATE_DIMENSIONS = [
  ...SMART_PROFILE_VOCAB_FACETABLE_DIMENSIONS,
  "objects",
] as const;

export type SmartProfileVocabAggregateDim =
  (typeof SMART_PROFILE_VOCAB_AGGREGATE_DIMENSIONS)[number];

export type SmartProfileVocabFacetableDim =
  (typeof SMART_PROFILE_VOCAB_FACETABLE_DIMENSIONS)[number];

export type SmartProfileVocabLists = Partial<
  Record<SmartProfileVocabFacetableDim | "objects", readonly string[]>
>;

export function takeTopNFromCounts(
  counts: Readonly<Record<string, number>> | undefined,
  topN: number = SMART_PROFILE_VOCAB_TOP_N_DEFAULT,
): string[] {
  if (!counts || topN <= 0) {
    return [];
  }

  return Object.entries(counts)
    .filter(([value, count]) => value.trim() && Number.isFinite(count) && count > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, topN)
    .map(([value]) => value.trim());
}

export function buildSmartProfileDimensionVocab(
  lists: SmartProfileVocabLists | undefined,
): SmartProfileDimensionVocab {
  if (!lists) {
    return {};
  }

  const vocab: SmartProfileDimensionVocab = {};
  const assign = (dim: keyof SmartProfileDimensionVocab, values: readonly string[] | undefined) => {
    if (!values || values.length === 0) {
      return;
    }
    vocab[dim] = buildSmartCanonicalVocabMap(values);
  };

  assign("subjects", lists.subjects);
  assign("objects", lists.objects);
  assign("styles", lists.styles);
  assign("themes", lists.themes);
  assign("interests", lists.interests);
  assign("professionsGroups", lists.professionsGroups);
  assign("occasions", lists.occasions);
  assign("places", lists.places);
  assign("colors", lists.colors);

  return vocab;
}

export function formatSmartProfileVocabPromptSection(
  lists: SmartProfileVocabLists | undefined,
): string {
  if (!lists) {
    return "(none — invent accurate new terms when clearly supported)";
  }

  const lines: string[] = [];
  const append = (label: string, values: readonly string[] | undefined) => {
    if (!values || values.length === 0) {
      return;
    }
    lines.push(`${label}: ${values.join(", ")}`);
  };

  append("subjects", lists.subjects);
  append("objects", lists.objects);
  append("styles", lists.styles);
  append("themes", lists.themes);
  append("interests", lists.interests);
  append("professionsGroups", lists.professionsGroups);
  append("occasions", lists.occasions);
  append("places", lists.places);
  append("colors", lists.colors);

  if (lines.length === 0) {
    return "(none — invent accurate new terms when clearly supported)";
  }

  return [
    "Prefer reusing an existing value below when it represents the SAME concept.",
    "If none safely matches, invent the correct new concise term.",
    "Do not collapse distinct identities (e.g. highland cow ≠ cow alone when highland is clear).",
    ...lines,
  ].join("\n");
}

export function isEmptySmartCanonicalVocab(vocab: SmartProfileDimensionVocab | undefined): boolean {
  if (!vocab) {
    return true;
  }
  return Object.values(vocab).every((map) => !map || (map as SmartCanonicalVocabMap).size === 0);
}
