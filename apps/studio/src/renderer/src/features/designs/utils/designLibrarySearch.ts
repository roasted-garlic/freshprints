import type { AiReviewStatus } from "../types/aiReview.types";
import type { Category } from "../types/category.types";
import type { Design } from "../types/design.types";
import { catalogDesignTextMatchesSearch } from "@fresh-prints/shared/utils/catalogDesignTextSearch";
import { resolveDesignAiReviewDisplay } from "./aiReviewState";

function resolveDesignSearchableTitle(design: Design): string {
  const suggestionTitle = design.aiSuggestions?.title?.trim();
  return suggestionTitle || design.title?.trim() || "";
}

function resolveDesignSearchableDescription(design: Design): string | null {
  const suggestionDescription = design.aiSuggestions?.description?.trim();
  return suggestionDescription || design.description || null;
}

/**
 * Local Studio search deliberately excludes the retired tag taxonomy. The optional third
 * argument remains only as a source-compatibility slot for stale callers; it is never read.
 */
export function designMatchesSearchQuery(
  design: Design,
  searchQuery: string,
  _retiredCatalogTags?: readonly unknown[],
): boolean {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return catalogDesignTextMatchesSearch(
    {
      id: design.id,
      title: resolveDesignSearchableTitle(design),
      description: resolveDesignSearchableDescription(design),
      tags: [],
    },
    normalizedQuery,
  );
}

export function filterDesignsBySearch(
  designs: Design[],
  searchQuery: string,
  retiredCatalogTags?: readonly unknown[],
): Design[] {
  if (!searchQuery.trim()) return designs;
  return designs.filter((design) =>
    designMatchesSearchQuery(design, searchQuery, retiredCatalogTags),
  );
}

export function filterDesignsByAiReviewStatus(
  designs: Design[],
  aiReviewStatus: AiReviewStatus | undefined,
): Design[] {
  if (!aiReviewStatus) return designs;
  return designs.filter(
    (design) => resolveDesignAiReviewDisplay(design).aiReviewStatus === aiReviewStatus,
  );
}

/** Apply the human-only Halftone staff decision; legacy tags are never consulted. */
export function filterDesignsByHalftone(designs: Design[], halftoneOn: boolean): Design[] {
  if (!halftoneOn) return designs;
  return designs.filter((design) => design.halftoneStaffDecision?.value === true);
}

export function filterDesignsByCategory(designs: Design[], categoryId?: string): Design[] {
  if (!categoryId?.trim()) return designs;
  return designs.filter((design) => design.categoryId === categoryId);
}

/** "Needs Companion" — `companionSetIncomplete === true` (staff-only denorm on `Design`). */
export function filterDesignsByNeedsCompanion(
  designs: Design[],
  needsCompanionOn: boolean,
): Design[] {
  if (!needsCompanionOn) return designs;
  return designs.filter((design) => design.companionSetIncomplete === true);
}

export function collectUsedCategoryIds(designs: Design[]): string[] {
  const usedCategoryIds = new Set<string>();
  for (const design of designs) {
    if (design.categoryId?.trim()) usedCategoryIds.add(design.categoryId);
  }
  return [...usedCategoryIds].sort((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: "base" }),
  );
}

export interface CategoryFilterOption {
  label: string;
  value: string;
}

export function buildCategoryFilterOptions(params: {
  allOptionValue: string;
  categories: Category[];
  designs: Design[];
  selectedCategoryId?: string;
}): CategoryFilterOption[] {
  const { allOptionValue, categories, designs, selectedCategoryId } = params;
  const usedCategoryIds = new Set(collectUsedCategoryIds(designs));
  const options: CategoryFilterOption[] = [{ label: "All categories", value: allOptionValue }];

  for (const category of categories) {
    if (!category.isActive) continue;
    if (!usedCategoryIds.has(category.id) && category.id !== selectedCategoryId) continue;
    options.push({ label: category.name, value: category.id });
  }
  return options;
}

/** Category options from Algolia `categoryId` facet IDs; selected remains visible. */
export function buildCategoryFilterOptionsFromFacetIds(params: {
  allOptionValue: string;
  categories: Category[];
  facetCategoryIds: readonly string[];
  selectedCategoryId?: string;
}): CategoryFilterOption[] {
  const { allOptionValue, categories, facetCategoryIds, selectedCategoryId } = params;
  const allowed = new Set(facetCategoryIds.map((id) => id.trim()).filter(Boolean));
  const options: CategoryFilterOption[] = [{ label: "All categories", value: allOptionValue }];

  for (const category of categories) {
    if (!category.isActive) continue;
    if (!allowed.has(category.id) && category.id !== selectedCategoryId) continue;
    options.push({ label: category.name, value: category.id });
  }
  return options;
}
