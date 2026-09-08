export interface CategoryOptionRef {
  label: string;
  value: string;
}

function normalizeCategoryKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function categoryTokens(value: string): string[] {
  return normalizeCategoryKey(value).split(" ").filter(Boolean);
}

/**
 * Resolve AI category alternatives only against existing catalog options.
 * Never invents IDs; unmatched names return null (informational only).
 */
export function resolveExistingCategoryChoice(
  candidate: { categoryId?: string; categoryName: string },
  options: CategoryOptionRef[],
): CategoryOptionRef | null {
  const byId = candidate.categoryId?.trim();
  if (byId) {
    const match = options.find((option) => option.value === byId);
    if (match) {
      return match;
    }
  }

  const nameKey = normalizeCategoryKey(candidate.categoryName);
  if (!nameKey) {
    return null;
  }

  const exactMatch = options.find((option) => normalizeCategoryKey(option.label) === nameKey);
  if (exactMatch) {
    return exactMatch;
  }

  // AI sometimes omits punctuation, conjunctions, or a descriptive suffix. Resolve only when
  // the candidate shares a strong token set with one existing catalog category.
  const candidateTokens = new Set(categoryTokens(candidate.categoryName));
  if (candidateTokens.size < 2) {
    return null;
  }
  return (
    options.find((option) => {
      const optionTokens = new Set(categoryTokens(option.label));
      const shared = [...candidateTokens].filter((token) => optionTokens.has(token)).length;
      return shared >= 2 && shared / Math.max(candidateTokens.size, optionTokens.size) >= 0.66;
    }) ?? null
  );
}
