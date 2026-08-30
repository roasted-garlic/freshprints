/**
 * Category dominant-intent conflict (Gate I corrective / Slice 5).
 *
 * Decision-layer hard blocker — does NOT create/rename categories and does not
 * change catalogThemeCategoryResolver exact-match trust. When conflict fires,
 * unattended approval is denied (`category_dominant_intent_conflict`).
 *
 * ## Algorithm (deterministic)
 *
 * ### Inputs
 * - `categoryName` — resolved approved category display name
 * - Dominant Smart Profile signals (only):
 *   - `themes`
 *   - `interests`
 *   - `searchConcepts`
 *   - `places`
 * - Explicitly NOT used: `objects`, `subjects`, `styles` (incidental scenery / style noise)
 *
 * ### Tokenization
 * Lowercase; split on non-alphanumeric; keep tokens with length > 2; drop a small
 * stopword set (a/an/and/for/of/the/to/with/from).
 *
 * ### Dominant-intent families
 * Each family is a set of signal tokens. A family scores as the count of distinct
 * family tokens present in the union of dominant-signal tokens.
 *
 * Currently defined:
 * - `fantasy_story_reading` — fantasy / storytelling / reading / book / fairy-tale intent
 *
 * ### Scenic category families
 * Category-name tokens are matched against scenic families that often appear as
 * secondary imagery rather than buyer intent:
 * - `floral_nature` — floral / nature / botanical / garden (e.g. "Floral & Nature")
 *
 * ### Conflict rule
 * Emit `category_dominant_intent_conflict` when ALL of:
 * 1. strongest dominant-intent family score ≥ {@link DOMINANT_INTENT_MIN_SCORE} (default 2)
 * 2. category name matches a scenic family (token intersection ≥ 1)
 * 3. scenic-family token overlap inside dominant signals is **strictly less than**
 *    that dominant family score (scenery is secondary relative to the dominant story)
 *
 * Example deny: fantasy/storytelling/reading score 4, category "Floral & Nature",
 * and only `nature` (+ optional mushroom) appear in signals → conflict.
 * Example approve: category "Floral & Nature" with dominant floral/nature signals and
 * no strong fantasy_story_reading family → no conflict.
 */

export const CATEGORY_DOMINANT_INTENT_CONFLICT_CODE = "category_dominant_intent_conflict" as const;

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "for",
  "of",
  "the",
  "to",
  "with",
  "from",
]);

/** Minimum distinct dominant-family tokens required to treat intent as strong. */
export const DOMINANT_INTENT_MIN_SCORE = 2;

/** @deprecated Kept for fixture docs; conflict uses relative scenic < dominant score. */
export const SCENIC_SECONDARY_MAX = 1;

interface IntentFamily {
  id: string;
  signalTokens: ReadonlySet<string>;
}

interface ScenicCategoryFamily {
  id: string;
  categoryTokens: ReadonlySet<string>;
  /** Same tokens used to measure how much scenery appears in dominant signals. */
  signalTokens: ReadonlySet<string>;
}

const FANTASY_STORY_READING: IntentFamily = {
  id: "fantasy_story_reading",
  signalTokens: new Set([
    "fantasy",
    "storytelling",
    "story",
    "stories",
    "reading",
    "reader",
    "book",
    "books",
    "storybook",
    "magical",
    "magic",
    "fairy",
    "tale",
    "tales",
    "enchanted",
    "imagination",
    "fiction",
    "adventure",
    "fairytale",
  ]),
};

const DOMINANT_INTENT_FAMILIES: readonly IntentFamily[] = [FANTASY_STORY_READING];

const FLORAL_NATURE_SCENIC: ScenicCategoryFamily = {
  id: "floral_nature",
  categoryTokens: new Set([
    "floral",
    "flower",
    "flowers",
    "nature",
    "botanical",
    "garden",
    "gardens",
  ]),
  signalTokens: new Set([
    "floral",
    "flower",
    "flowers",
    "nature",
    "botanical",
    "garden",
    "gardens",
    "mushroom",
    "mushrooms",
    "leaf",
    "leaves",
  ]),
};

const SCENIC_CATEGORY_FAMILIES: readonly ScenicCategoryFamily[] = [FLORAL_NATURE_SCENIC];

export function tokenizeCategoryIntentText(value: string | undefined | null): string[] {
  if (!value?.trim()) {
    return [];
  }
  return value
    .trim()
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

export function collectDominantIntentTokens(input: {
  themes?: readonly string[];
  interests?: readonly string[];
  searchConcepts?: readonly string[];
  places?: readonly string[];
}): Set<string> {
  const tokens = new Set<string>();
  const lists = [input.themes, input.interests, input.searchConcepts, input.places];
  for (const list of lists) {
    for (const entry of list ?? []) {
      for (const token of tokenizeCategoryIntentText(entry)) {
        tokens.add(token);
      }
    }
  }
  return tokens;
}

function scoreFamily(tokens: ReadonlySet<string>, familyTokens: ReadonlySet<string>): number {
  let score = 0;
  for (const token of familyTokens) {
    if (tokens.has(token)) {
      score += 1;
    }
  }
  return score;
}

function categoryMatchesScenic(
  categoryTokens: ReadonlySet<string>,
  scenic: ScenicCategoryFamily,
): boolean {
  for (const token of scenic.categoryTokens) {
    if (categoryTokens.has(token)) {
      return true;
    }
  }
  return false;
}

/**
 * Returns `category_dominant_intent_conflict` when a strong dominant-intent family
 * conflicts with a scenic category that is only weakly supported in profile signals.
 */
export function detectCategoryDominantIntentConflict(input: {
  categoryName?: string;
  themes?: readonly string[];
  interests?: readonly string[];
  searchConcepts?: readonly string[];
  places?: readonly string[];
}): typeof CATEGORY_DOMINANT_INTENT_CONFLICT_CODE | null {
  const categoryName = input.categoryName?.trim();
  if (!categoryName) {
    return null;
  }

  const categoryTokens = new Set(tokenizeCategoryIntentText(categoryName));
  if (categoryTokens.size === 0) {
    return null;
  }

  const dominantTokens = collectDominantIntentTokens(input);
  if (dominantTokens.size === 0) {
    return null;
  }

  let strongestDominantScore = 0;
  for (const family of DOMINANT_INTENT_FAMILIES) {
    strongestDominantScore = Math.max(
      strongestDominantScore,
      scoreFamily(dominantTokens, family.signalTokens),
    );
  }
  if (strongestDominantScore < DOMINANT_INTENT_MIN_SCORE) {
    return null;
  }

  for (const scenic of SCENIC_CATEGORY_FAMILIES) {
    if (!categoryMatchesScenic(categoryTokens, scenic)) {
      continue;
    }
    const scenicInSignals = scoreFamily(dominantTokens, scenic.signalTokens);
    // Scenery must be weaker than the dominant intent family to treat category as mismatched.
    if (scenicInSignals < strongestDominantScore) {
      return CATEGORY_DOMINANT_INTENT_CONFLICT_CODE;
    }
  }

  return null;
}
