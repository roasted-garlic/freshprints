/**
 * Calibration helpers: aggregate overlap + hard primary-identity checks.
 * ~80% Jaccard alone is NOT sufficient for PASS.
 */

import { smartCanonicalKey } from "./smartCanonicalKey";

const CORE_SEMANTIC_DIMS = [
  "subjects",
  "objects",
  "styles",
  "themes",
  "interests",
  "professionsGroups",
  "occasions",
  "places",
  "visibleText",
] as const;

export type CoreSemanticDim = (typeof CORE_SEMANTIC_DIMS)[number];

function toCanonicalSet(values: readonly string[] | undefined): Set<string> {
  const set = new Set<string>();
  if (!values) {
    return set;
  }
  for (const value of values) {
    const key = smartCanonicalKey(value);
    if (key) {
      set.add(key);
    }
  }
  return set;
}

export function jaccardOverlap(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 && b.size === 0) {
    return 1;
  }
  let intersection = 0;
  for (const key of a) {
    if (b.has(key)) {
      intersection += 1;
    }
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 1 : intersection / union;
}

export interface SmartProfileCoreLists {
  subjects?: string[];
  objects?: string[];
  styles?: string[];
  themes?: string[];
  interests?: string[];
  professionsGroups?: string[];
  occasions?: string[];
  places?: string[];
  visibleText?: string[];
  searchConcepts?: string[];
  colors?: string[];
}

export function aggregateCoreSemanticOverlap(
  left: SmartProfileCoreLists,
  right: SmartProfileCoreLists,
): number {
  const leftAll = new Set<string>();
  const rightAll = new Set<string>();

  for (const dim of CORE_SEMANTIC_DIMS) {
    for (const key of toCanonicalSet(left[dim])) {
      leftAll.add(`${dim}:${key}`);
    }
    for (const key of toCanonicalSet(right[dim])) {
      rightAll.add(`${dim}:${key}`);
    }
  }

  return jaccardOverlap(leftAll, rightAll);
}

export interface RequiredCoreConceptCheck {
  /** Dimension that must retain the concept (e.g. subjects). */
  dimension: CoreSemanticDim | "searchConcepts";
  /** Phrase that must remain present under safe canonical matching. */
  concept: string;
  label?: string;
}

export interface CoreIdentityCheckResult {
  pass: boolean;
  missing: Array<{ dimension: string; concept: string; label?: string }>;
}

/**
 * Hard FAIL when a clearly supported primary identity disappears across runs/variants.
 */
export function checkRequiredCoreConcepts(
  profile: SmartProfileCoreLists,
  required: readonly RequiredCoreConceptCheck[],
): CoreIdentityCheckResult {
  const missing: CoreIdentityCheckResult["missing"] = [];

  for (const entry of required) {
    const list = profile[entry.dimension];
    const set = toCanonicalSet(list);
    const want = smartCanonicalKey(entry.concept);
    if (!want || !set.has(want)) {
      missing.push({
        dimension: entry.dimension,
        concept: entry.concept,
        ...(entry.label ? { label: entry.label } : {}),
      });
    }
  }

  return { pass: missing.length === 0, missing };
}

/**
 * Color-variant / repeated-run evaluation: aggregate AND hard core checks.
 */
export function evaluateSemanticConsistency(input: {
  left: SmartProfileCoreLists;
  right: SmartProfileCoreLists;
  requiredCoreConcepts: readonly RequiredCoreConceptCheck[];
  /** Aggregate threshold (calibration metric only — not sufficient alone). */
  minAggregateOverlap?: number;
}): {
  pass: boolean;
  aggregateOverlap: number;
  aggregatePass: boolean;
  coreIdentity: CoreIdentityCheckResult;
  reasons: string[];
} {
  const minAggregate = input.minAggregateOverlap ?? 0.8;
  const aggregateOverlap = aggregateCoreSemanticOverlap(input.left, input.right);
  const aggregatePass = aggregateOverlap >= minAggregate;

  const leftCore = checkRequiredCoreConcepts(input.left, input.requiredCoreConcepts);
  const rightCore = checkRequiredCoreConcepts(input.right, input.requiredCoreConcepts);
  const coreIdentity: CoreIdentityCheckResult = {
    pass: leftCore.pass && rightCore.pass,
    missing: [...leftCore.missing, ...rightCore.missing],
  };

  const reasons: string[] = [];
  if (!aggregatePass) {
    reasons.push(
      `aggregate_overlap_below_threshold:${aggregateOverlap.toFixed(3)}<${minAggregate}`,
    );
  }
  if (!coreIdentity.pass) {
    for (const m of coreIdentity.missing) {
      reasons.push(`missing_core:${m.dimension}:${m.concept}`);
    }
  }

  return {
    pass: aggregatePass && coreIdentity.pass,
    aggregateOverlap,
    aggregatePass,
    coreIdentity,
    reasons,
  };
}

/** Text-meta concepts that may appear in themes/styles/searchConcepts when wording is the design. */
export const TEXT_DOMINANT_META_CONCEPTS = [
  "text",
  "typography",
  "quote",
  "saying",
  "slogan",
] as const;

export function profileHasTextMetaConcept(profile: SmartProfileCoreLists): boolean {
  const bags = [
    profile.themes,
    profile.styles,
    profile.interests,
    profile.searchConcepts,
  ];
  const want = new Set(TEXT_DOMINANT_META_CONCEPTS.map((c) => smartCanonicalKey(c)));

  for (const bag of bags) {
    for (const key of toCanonicalSet(bag)) {
      if (want.has(key)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Soft heuristic: readable text present, little/no subject art → expect ≥1 text meta when
 * text-dominant. Used for calibration / Soft concern — not a Manual/Shadow hard blocker.
 */
export function textDominantSoftCheck(input: {
  readableTextLines: readonly string[] | undefined;
  subjects: readonly string[] | undefined;
  objects: readonly string[] | undefined;
  profile: SmartProfileCoreLists;
}): { fires: boolean; hasMeta: boolean; softFail: boolean } {
  const hasReadable = (input.readableTextLines?.filter((l) => l.trim()).length ?? 0) > 0;
  const subjectCount = input.subjects?.length ?? 0;
  const objectCount = input.objects?.length ?? 0;
  const fires = hasReadable && subjectCount === 0 && objectCount <= 1;
  const hasMeta = profileHasTextMetaConcept(input.profile);
  return { fires, hasMeta, softFail: fires && !hasMeta };
}
