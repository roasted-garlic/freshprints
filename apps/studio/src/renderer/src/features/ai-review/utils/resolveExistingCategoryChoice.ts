export interface CategoryOptionRef {
  label: string;
  value: string;
}

function normalizeCategoryKey(value: string): string {
  return value.trim().toLowerCase();
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

  const match = options.find((option) => normalizeCategoryKey(option.label) === nameKey);
  return match ?? null;
}
