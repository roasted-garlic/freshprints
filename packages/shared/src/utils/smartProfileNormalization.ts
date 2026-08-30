import {

  SMART_PROFILE_MAX_CATEGORY_ALTERNATIVES,

  SMART_PROFILE_MAX_GAP_EVIDENCE_LENGTH,

  SMART_PROFILE_MAX_ITEMS_PER_DIMENSION,

  SMART_PROFILE_MAX_SEARCH_CONCEPTS,

  SMART_PROFILE_MAX_SEARCH_CONCEPT_LENGTH,

  SMART_PROFILE_MAX_STRING_LENGTH,

  SMART_PROFILE_NORMALIZER_VERSION,

} from "../constants/smartProfile.constants";

import type {

  DesignSmartProfile,

  SmartProfileCategoryAlternative,

  SmartProfileDimensionLists,

} from "../types/catalog/smartProfile.types";

import { promoteSubjectsWithTitleSpecificity } from "./catalogAutomationEvidence";

import {

  buildSmartCanonicalVocabMap,

  matchExactCanonicalDisplay,

  smartCanonicalKey,

  type SmartCanonicalVocabMap,

} from "./smartCanonicalKey";



export { SMART_PROFILE_NORMALIZER_VERSION };

export { smartCanonicalKey, buildSmartCanonicalVocabMap, matchExactCanonicalDisplay };

export type { SmartCanonicalVocabMap };



function collapseWhitespace(value: string): string {

  return value.replace(/\s+/g, " ").trim();

}



function normalizeToken(value: string, maxLength: number): string {

  return collapseWhitespace(value).slice(0, maxLength);

}



function dedupeKey(value: string): string {

  return smartCanonicalKey(value) || collapseWhitespace(value).toLowerCase();

}



export interface NormalizeSmartProfileStringListOptions {

  maxItems?: number;

  maxItemLength?: number;

  /** Bounded auto-derived vocab — exact/canonical match only; novel terms preserved. */

  canonicalVocab?: SmartCanonicalVocabMap;

}



/**

 * Normalize a list of discovery strings: trim, cap length, safe canonicalize,

 * dedupe by canonical key, limit count.

 */

export function normalizeSmartProfileStringList(

  values: readonly string[] | undefined,

  options: NormalizeSmartProfileStringListOptions = {},

): string[] | undefined {

  const maxItems = options.maxItems ?? SMART_PROFILE_MAX_ITEMS_PER_DIMENSION;

  const maxItemLength = options.maxItemLength ?? SMART_PROFILE_MAX_STRING_LENGTH;



  if (!values || values.length === 0) {

    return undefined;

  }



  const result: string[] = [];

  const seen = new Set<string>();



  for (const raw of values) {

    if (typeof raw !== "string") {

      continue;

    }



    const matched = matchExactCanonicalDisplay(raw, options.canonicalVocab);

    const normalized = normalizeToken(matched, maxItemLength);

    if (!normalized) {

      continue;

    }



    const key = dedupeKey(normalized);

    if (!key || seen.has(key)) {

      continue;

    }



    seen.add(key);

    result.push(normalized);



    if (result.length >= maxItems) {

      break;

    }

  }



  return result.length > 0 ? result : undefined;

}



export function normalizeSmartProfileCategoryAlternatives(

  values: readonly SmartProfileCategoryAlternative[] | undefined,

): SmartProfileCategoryAlternative[] | undefined {

  if (!values || values.length === 0) {

    return undefined;

  }



  const result: SmartProfileCategoryAlternative[] = [];

  const seen = new Set<string>();



  for (const entry of values) {

    if (!entry || typeof entry !== "object") {

      continue;

    }



    const categoryName = normalizeToken(entry.categoryName ?? "", SMART_PROFILE_MAX_STRING_LENGTH);

    if (!categoryName) {

      continue;

    }



    const key = dedupeKey(categoryName);

    if (seen.has(key)) {

      continue;

    }



    seen.add(key);

    const categoryId =

      typeof entry.categoryId === "string" ? entry.categoryId.trim() || undefined : undefined;

    const reason =

      typeof entry.reason === "string"

        ? normalizeToken(entry.reason, SMART_PROFILE_MAX_STRING_LENGTH) || undefined

        : undefined;

    result.push({

      categoryName,

      ...(categoryId ? { categoryId } : {}),

      ...(reason ? { reason } : {}),

    });



    if (result.length >= SMART_PROFILE_MAX_CATEGORY_ALTERNATIVES) {

      break;

    }

  }



  return result.length > 0 ? result : undefined;

}



export interface SmartProfileDimensionVocab {

  subjects?: SmartCanonicalVocabMap;

  objects?: SmartCanonicalVocabMap;

  styles?: SmartCanonicalVocabMap;

  themes?: SmartCanonicalVocabMap;

  interests?: SmartCanonicalVocabMap;

  professionsGroups?: SmartCanonicalVocabMap;

  occasions?: SmartCanonicalVocabMap;

  places?: SmartCanonicalVocabMap;

  colors?: SmartCanonicalVocabMap;

  /** Visible text / search concepts generally skip vocab fold (search intelligence). */

}



export function normalizeSmartProfileDimensions(

  input: SmartProfileDimensionLists,

  vocab?: SmartProfileDimensionVocab,

): SmartProfileDimensionLists {

  return {

    subjects: normalizeSmartProfileStringList(input.subjects, { canonicalVocab: vocab?.subjects }),

    objects: normalizeSmartProfileStringList(input.objects, { canonicalVocab: vocab?.objects }),

    styles: normalizeSmartProfileStringList(input.styles, { canonicalVocab: vocab?.styles }),

    themes: normalizeSmartProfileStringList(input.themes, { canonicalVocab: vocab?.themes }),

    interests: normalizeSmartProfileStringList(input.interests, {

      canonicalVocab: vocab?.interests,

    }),

    professionsGroups: normalizeSmartProfileStringList(input.professionsGroups, {

      canonicalVocab: vocab?.professionsGroups,

    }),

    occasions: normalizeSmartProfileStringList(input.occasions, {

      canonicalVocab: vocab?.occasions,

    }),

    places: normalizeSmartProfileStringList(input.places, { canonicalVocab: vocab?.places }),

    colors: normalizeSmartProfileStringList(input.colors, { canonicalVocab: vocab?.colors }),

    visibleText: normalizeSmartProfileStringList(input.visibleText, { maxItemLength: 120 }),

    searchConcepts: normalizeSmartProfileStringList(input.searchConcepts, {

      maxItems: SMART_PROFILE_MAX_SEARCH_CONCEPTS,

      maxItemLength: SMART_PROFILE_MAX_SEARCH_CONCEPT_LENGTH,

    }),

  };

}



/** Merge readable text lines into visibleText when the model did not populate visibleText. */

export function mergeVisibleTextFromReadableLines(

  visibleText: string[] | undefined,

  readableTextLines: readonly string[] | undefined,

): string[] | undefined {

  const fromVisible = normalizeSmartProfileStringList(visibleText, { maxItemLength: 120 });

  if (fromVisible && fromVisible.length > 0) {

    return fromVisible;

  }



  return normalizeSmartProfileStringList(readableTextLines, { maxItemLength: 120 });

}



export function normalizeDesignSmartProfile(

  profile: DesignSmartProfile,

  vocab?: SmartProfileDimensionVocab,

  evidence?: {
    title?: string;
    centralSubject?: string;
    description?: string;
    visibleText?: string[];
  },

): DesignSmartProfile {

  const subjectsWithSpecificity = promoteSubjectsWithTitleSpecificity({

    title: evidence?.title,

    centralSubject: evidence?.centralSubject,

    description: evidence?.description,

    visibleText: evidence?.visibleText ?? profile.visibleText,

    subjects: profile.subjects,

  });

  const dimensions = normalizeSmartProfileDimensions(

    {

      ...profile,

      subjects: subjectsWithSpecificity,

    },

    vocab,

  );



  return {

    ...dimensions,

    categoryId: profile.categoryId?.trim() || undefined,

    categoryName: profile.categoryName

      ? normalizeToken(profile.categoryName, SMART_PROFILE_MAX_STRING_LENGTH)

      : undefined,

    categoryAlternatives: normalizeSmartProfileCategoryAlternatives(profile.categoryAlternatives),

    categoryGapSuggested: profile.categoryGapSuggested === true ? true : undefined,

    categoryGapEvidence: profile.categoryGapEvidence

      ? normalizeToken(profile.categoryGapEvidence, SMART_PROFILE_MAX_GAP_EVIDENCE_LENGTH)

      : undefined,

    provenance: {

      ...profile.provenance,

      normalizerVersion: SMART_PROFILE_NORMALIZER_VERSION,

    },

  };

}


