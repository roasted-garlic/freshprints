import { normalizeComparableTitle } from "./catalogTitleRules";

const CATEGORY_STOPWORDS = new Set([
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

const THEME_KEYWORD_WEIGHT = 2;
const VISIBLE_TEXT_KEYWORD_WEIGHT = 2;
const SUBJECT_KEYWORD_WEIGHT = 1;
const CATEGORY_NAME_TOKEN_WEIGHT = 1;
const MIN_REMAP_SCORE = 2;

export interface ResolveCatalogCategoryInput {
  candidate?: string;
  allowedNames: string[];
  theme?: string;
  visibleText?: string[];
  primarySubject?: string;
}

export interface ResolveCatalogCategoryResult {
  categoryName?: string;
  categoryId?: string;
  remapped: boolean;
  originalCandidate?: string;
}

function tokenizeForCategoryMatch(value: string | undefined): string[] {
  if (!value?.trim()) {
    return [];
  }

  return normalizeComparableTitle(value)
    .split(" ")
    .filter((token) => token.length > 2 && !CATEGORY_STOPWORDS.has(token));
}

function buildCategoryLookup(allowedNames: string[]): Map<string, string> {
  const lookup = new Map<string, string>();

  for (const name of allowedNames) {
    lookup.set(name.toLowerCase(), name);
  }

  return lookup;
}

function scoreCategoryMatch(
  allowedName: string,
  tokens: { theme: string[]; visibleText: string[]; subject: string[] },
): number {
  const categoryTokens = tokenizeForCategoryMatch(allowedName);
  let score = 0;

  for (const token of categoryTokens) {
    if (tokens.theme.includes(token)) {
      score += THEME_KEYWORD_WEIGHT;
    }

    if (tokens.visibleText.includes(token)) {
      score += VISIBLE_TEXT_KEYWORD_WEIGHT;
    }

    if (tokens.subject.includes(token)) {
      score += SUBJECT_KEYWORD_WEIGHT;
    }

    if (normalizeComparableTitle(allowedName).includes(token)) {
      score += CATEGORY_NAME_TOKEN_WEIGHT;
    }
  }

  return score;
}

export function resolveCatalogCategory(
  input: ResolveCatalogCategoryInput,
  categoryIdsByName: Record<string, string>,
): ResolveCatalogCategoryResult {
  const lookup = buildCategoryLookup(input.allowedNames);
  const candidate = input.candidate?.trim();

  if (candidate) {
    const exact = lookup.get(candidate.toLowerCase());

    if (exact) {
      const tokens = {
        theme: tokenizeForCategoryMatch(input.theme),
        visibleText: (input.visibleText ?? []).flatMap((phrase) => tokenizeForCategoryMatch(phrase)),
        subject: tokenizeForCategoryMatch(input.primarySubject),
      };
      const exactScore = scoreCategoryMatch(exact, tokens);
      let bestName = exact;
      let bestScore = exactScore;

      for (const allowedName of input.allowedNames) {
        const score = scoreCategoryMatch(allowedName, tokens);

        if (score > bestScore) {
          bestScore = score;
          bestName = allowedName;
        }
      }

      if (
        bestName !== exact &&
        bestScore >= MIN_REMAP_SCORE &&
        bestScore > exactScore
      ) {
        return {
          categoryName: bestName,
          categoryId: categoryIdsByName[bestName.toLowerCase()],
          remapped: true,
          originalCandidate: candidate,
        };
      }

      return {
        categoryName: exact,
        categoryId: categoryIdsByName[exact.toLowerCase()],
        remapped: false,
      };
    }
  }

  if (input.allowedNames.length === 0) {
    return {
      categoryName: candidate,
      categoryId: candidate ? categoryIdsByName[candidate.toLowerCase()] : undefined,
      remapped: false,
      originalCandidate: candidate,
    };
  }

  const tokens = {
    theme: tokenizeForCategoryMatch(input.theme),
    visibleText: (input.visibleText ?? []).flatMap((phrase) => tokenizeForCategoryMatch(phrase)),
    subject: tokenizeForCategoryMatch(input.primarySubject),
  };

  let bestName: string | undefined;
  let bestScore = 0;

  for (const allowedName of input.allowedNames) {
    const score = scoreCategoryMatch(allowedName, tokens);

    if (score > bestScore) {
      bestScore = score;
      bestName = allowedName;
    }
  }

  if (!bestName || bestScore < MIN_REMAP_SCORE) {
    return {
      categoryName: undefined,
      categoryId: undefined,
      remapped: Boolean(candidate),
      originalCandidate: candidate,
    };
  }

  return {
    categoryName: bestName,
    categoryId: categoryIdsByName[bestName.toLowerCase()],
    remapped: true,
    originalCandidate: candidate,
  };
}
