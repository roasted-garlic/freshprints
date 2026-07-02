import { normalizeForAliasMatch } from "./catalogTagResolver";
import { normalizeComparableTitle } from "./catalogTitleRules";

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "for",
  "in",
  "of",
  "or",
  "the",
  "to",
  "with",
]);

const MIN_RESOLVE_SCORE = 2;
const TOKEN_OVERLAP_WEIGHT = 1;
const PRIORITY_BOOST_WEIGHT = 4;

export interface ResolveThemeCategoryInput {
  rawCategory?: string;
  title?: string;
  description?: string;
  visibleText?: string[];
  matchedTags: readonly string[];
  approvedCategories: readonly { id: string; name: string; description?: string }[];
}

export interface ResolveThemeCategoryResult {
  categoryName?: string;
  categoryId?: string;
}

function tokenize(value: string | undefined): string[] {
  if (!value?.trim()) {
    return [];
  }

  return normalizeComparableTitle(value)
    .split(" ")
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

/**
 * Buyer-intent / theme priority families. Each family lists the signal tokens that indicate the
 * theme, and the tokens an approved category's name+description must contain to receive the
 * boost. These are score boosts, not hardcoded category-name overrides — they compete on the same
 * scoring basis as plain token overlap, so a raw model category (even one naming a wrong category
 * outright, e.g. "Humorous Quotes") never gets special standing over a correctly-boosted category.
 */
interface PriorityFamily {
  signalTokens: ReadonlySet<string>;
  categoryTokens: ReadonlySet<string>;
}

const FAMILY_PRIORITY: PriorityFamily = {
  signalTokens: new Set([
    "motherhood",
    "mother",
    "mom",
    "moms",
    "mommy",
    "parenting",
    "parent",
    "parents",
    "fatherhood",
    "father",
    "dad",
    "dads",
    "daddy",
    "family",
  ]),
  categoryTokens: new Set(["family", "parenting", "motherhood", "fatherhood"]),
};

const FAITH_PRIORITY: PriorityFamily = {
  signalTokens: new Set([
    "faith",
    "faithful",
    "god",
    "jesus",
    "christ",
    "christian",
    "bible",
    "biblical",
    "church",
    "pray",
    "prayer",
    "blessed",
    "religious",
    "religion",
    "gospel",
    "worship",
  ]),
  categoryTokens: new Set(["faith", "religious", "christian", "spiritual"]),
};

const TEACHER_PRIORITY: PriorityFamily = {
  signalTokens: new Set([
    "teacher",
    "teachers",
    "teaching",
    "school",
    "classroom",
    "student",
    "students",
    "education",
    "educator",
    "educators",
  ]),
  categoryTokens: new Set(["teacher", "teachers", "teaching", "school", "education", "educator"]),
};

const PRIORITY_FAMILIES: readonly PriorityFamily[] = [FAMILY_PRIORITY, FAITH_PRIORITY, TEACHER_PRIORITY];

/**
 * Generic art-style-only tokens that must not, by themselves, push a design toward a
 * pop-culture/character category. They only count toward such a category when a genuine
 * character/franchise/brand-name signal is also present (handled naturally: these tokens are
 * simply excluded from scoring against pop-culture/character categories, so a real character name
 * like "wednesday" or "mario" still scores normally there).
 */
const STYLE_ONLY_TOKENS = new Set([
  "skeleton",
  "skeletons",
  "skull",
  "skulls",
  "cartoon",
  "mascot",
  "illustrated",
  "illustration",
  "character",
  "characters",
]);

const POP_CULTURE_CATEGORY_TOKENS = new Set(["pop", "culture", "character", "characters"]);

/** A bare "quote" signal must not by itself push toward a humor/quotes category. */
const HUMOR_SIGNAL_TOKENS = new Set(["funny", "humor", "humorous", "joke", "jokes", "comedy", "comedic"]);
const QUOTE_ONLY_TOKENS = new Set(["quote", "quotes", "saying", "sayings"]);
const HUMOR_CATEGORY_TOKENS = new Set(["humor", "humorous", "funny", "comedy"]);

function categoryTokenSet(categoryName: string, categoryDescription: string | undefined): Set<string> {
  return new Set([...tokenize(categoryName), ...tokenize(categoryDescription)]);
}

function isPopCultureCategory(categoryTokens: ReadonlySet<string>): boolean {
  return [...POP_CULTURE_CATEGORY_TOKENS].some((token) => categoryTokens.has(token));
}

function isHumorCategory(categoryTokens: ReadonlySet<string>): boolean {
  return [...HUMOR_CATEGORY_TOKENS].some((token) => categoryTokens.has(token));
}

function scoreCategory(
  categoryTokens: ReadonlySet<string>,
  signalTokens: readonly string[],
  signalTokenSet: ReadonlySet<string>,
): number {
  let score = 0;
  const categoryIsPopCulture = isPopCultureCategory(categoryTokens);
  const categoryIsHumor = isHumorCategory(categoryTokens);
  const hasHumorSignal = [...HUMOR_SIGNAL_TOKENS].some((token) => signalTokenSet.has(token));

  for (const token of signalTokens) {
    if (!categoryTokens.has(token)) {
      continue;
    }

    // Style-only tokens (skeleton, cartoon, etc.) never contribute score toward a pop-culture /
    // character category on their own — only a genuine character/franchise name does.
    if (categoryIsPopCulture && STYLE_ONLY_TOKENS.has(token)) {
      continue;
    }

    // A bare "quote" token never contributes score toward a humor/quotes category unless a
    // separate humor/funny/joke signal is also present among the tokens.
    if (categoryIsHumor && QUOTE_ONLY_TOKENS.has(token) && !hasHumorSignal) {
      continue;
    }

    score += TOKEN_OVERLAP_WEIGHT;
  }

  for (const family of PRIORITY_FAMILIES) {
    const hasSignal = signalTokens.some((token) => family.signalTokens.has(token));
    const categoryMatchesFamily = [...family.categoryTokens].some((token) => categoryTokens.has(token));

    if (hasSignal && categoryMatchesFamily) {
      score += PRIORITY_BOOST_WEIGHT;
    }
  }

  return score;
}

/**
 * Find an approved category whose name matches the raw model candidate exactly, tolerant of
 * casing and punctuation differences (the same normalization used for tag alias matching). The
 * v20 prompt shows the model the approved category name list directly, so an exact match here
 * means the model picked a real option — that choice is trusted outright rather than run through
 * the token-overlap/priority-boost fallback scorer below.
 */
function findExactCategoryNameMatch(
  rawCategory: string | undefined,
  approvedCategories: readonly { id: string; name: string; description?: string }[],
): { id: string; name: string } | undefined {
  if (!rawCategory?.trim()) {
    return undefined;
  }

  const normalizedCandidate = normalizeForAliasMatch(rawCategory);

  if (!normalizedCandidate) {
    return undefined;
  }

  return approvedCategories.find(
    (category) => normalizeForAliasMatch(category.name) === normalizedCandidate,
  );
}

/**
 * Deterministic, pure server-side category resolver for the v20 lean-plus-category-names prompt.
 * The model is shown the approved category name list and asked to copy one exactly — when its raw
 * category candidate exactly matches (case/punctuation tolerant) one of those approved names, that
 * match is trusted directly. Otherwise (typos, paraphrases, or a legacy prompt template that omits
 * the category list) the raw candidate is only one competing signal among
 * title/description/visibleText/matchedTags, scored via token overlap against every approved
 * category's name+description, with priority boosts for buyer-intent theme families
 * (family/faith/teacher) that can outweigh a raw candidate naming an unrelated category (e.g.
 * "Humorous Quotes") when the real signal points elsewhere.
 * Returns {} when there is no exact match and no approved category clears the minimum fallback
 * score — callers must leave categoryName/categoryId undefined in that case (never fall back to
 * the raw candidate string itself).
 */
export function resolveThemeCategory(
  input: ResolveThemeCategoryInput,
  categoryIdsByName: Record<string, string>,
): ResolveThemeCategoryResult {
  const exactMatch = findExactCategoryNameMatch(input.rawCategory, input.approvedCategories);

  if (exactMatch) {
    return { categoryId: exactMatch.id, categoryName: exactMatch.name };
  }

  const signalTokens = [
    ...tokenize(input.rawCategory),
    ...tokenize(input.title),
    ...tokenize(input.description),
    ...(input.visibleText ?? []).flatMap((phrase) => tokenize(phrase)),
    ...input.matchedTags.flatMap((tag) => tokenize(tag)),
  ];
  const signalTokenSet = new Set(signalTokens);

  let bestName: string | undefined;
  let bestScore = 0;

  for (const category of input.approvedCategories) {
    const tokens = categoryTokenSet(category.name, category.description);
    const score = scoreCategory(tokens, signalTokens, signalTokenSet);

    if (score > bestScore) {
      bestScore = score;
      bestName = category.name;
    }
  }

  if (!bestName || bestScore < MIN_RESOLVE_SCORE) {
    return {};
  }

  return {
    categoryName: bestName,
    categoryId: categoryIdsByName[bestName.toLowerCase()],
  };
}
