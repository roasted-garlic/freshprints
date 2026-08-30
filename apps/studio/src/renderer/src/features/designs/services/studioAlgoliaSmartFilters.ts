import {
  PORTAL_CATALOG_ALGOLIA_SMART_FACET_ATTRIBUTES,
  type PortalCatalogAlgoliaSmartFacetAttribute,
} from "@fresh-prints/shared/catalog-search/portalCatalogAlgoliaRecord";

import type { Design } from "../types/design.types";

/** Selections for the 8 customer-facing Smart Filter facets (state-only). */
export type StudioAlgoliaSmartFilters = Partial<
  Record<PortalCatalogAlgoliaSmartFacetAttribute, string[]>
>;

export interface StudioAlgoliaSmartFacetOption {
  value: string;
  count: number;
}

export const STUDIO_SMART_FILTER_DIMENSIONS: ReadonlyArray<{
  attribute: PortalCatalogAlgoliaSmartFacetAttribute;
  label: string;
}> = [
  { attribute: "subjects", label: "Subjects" },
  { attribute: "styles", label: "Styles" },
  { attribute: "themes", label: "Themes" },
  { attribute: "interests", label: "Interests" },
  { attribute: "professionsGroups", label: "Professions / Groups" },
  { attribute: "occasions", label: "Occasions" },
  { attribute: "places", label: "Places" },
  { attribute: "colors", label: "Colors" },
];

export function emptyStudioAlgoliaSmartFilters(): StudioAlgoliaSmartFilters {
  return {};
}

export function normalizeStudioAlgoliaSmartFilterValues(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right),
  );
}

export function hasStudioAlgoliaSmartFilterSelections(
  smartFilters: StudioAlgoliaSmartFilters | undefined,
): boolean {
  if (!smartFilters) return false;
  return PORTAL_CATALOG_ALGOLIA_SMART_FACET_ATTRIBUTES.some(
    (attribute) => (smartFilters[attribute] ?? []).some((value) => value.trim().length > 0),
  );
}

export function countStudioAlgoliaSmartFilterSelections(
  smartFilters: StudioAlgoliaSmartFilters | undefined,
): number {
  if (!smartFilters) return 0;
  let total = 0;
  for (const attribute of PORTAL_CATALOG_ALGOLIA_SMART_FACET_ATTRIBUTES) {
    total += normalizeStudioAlgoliaSmartFilterValues(smartFilters[attribute] ?? []).length;
  }
  return total;
}

/** Stable dependency key for React effects (order-independent within each attribute). */
export function serializeStudioAlgoliaSmartFilters(
  smartFilters: StudioAlgoliaSmartFilters | undefined,
): string {
  if (!smartFilters) return "";
  return PORTAL_CATALOG_ALGOLIA_SMART_FACET_ATTRIBUTES.map((attribute) => {
    const values = normalizeStudioAlgoliaSmartFilterValues(smartFilters[attribute] ?? []);
    return `${attribute}=${values.join("\u0001")}`;
  }).join("\u0000");
}

/**
 * Algolia facetFilters AND groups for Smart dimensions.
 * Within a dimension every selected value is required (AND).
 * Objects / searchConcepts / visibleText are never faceted here.
 */
export function buildStudioAlgoliaSmartFacetFilters(
  smartFilters: StudioAlgoliaSmartFilters | undefined,
): string[][] {
  if (!smartFilters) return [];
  const filters: string[][] = [];
  for (const attribute of PORTAL_CATALOG_ALGOLIA_SMART_FACET_ATTRIBUTES) {
    for (const value of normalizeStudioAlgoliaSmartFilterValues(smartFilters[attribute] ?? [])) {
      filters.push([`${attribute}:${value}`]);
    }
  }
  return filters;
}

export function mergeStudioAlgoliaSmartFacetDistribution(
  distribution: Record<string, number> | undefined,
): StudioAlgoliaSmartFacetOption[] {
  if (!distribution) return [];
  return Object.entries(distribution)
    .filter(([, count]) => count > 0)
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => left.value.localeCompare(right.value));
}

export function designMatchesSmartFilters(
  design: Design,
  smartFilters: StudioAlgoliaSmartFilters | undefined,
): boolean {
  if (!hasStudioAlgoliaSmartFilterSelections(smartFilters)) {
    return true;
  }
  const profile = design.smartProfile;
  for (const attribute of PORTAL_CATALOG_ALGOLIA_SMART_FACET_ATTRIBUTES) {
    const selected = normalizeStudioAlgoliaSmartFilterValues(smartFilters?.[attribute] ?? []);
    if (selected.length === 0) continue;
    const values = profile?.[attribute] ?? [];
    if (!selected.every((value) => values.includes(value))) {
      return false;
    }
  }
  return true;
}

export function listActiveStudioSmartFilterChips(
  smartFilters: StudioAlgoliaSmartFilters,
): Array<{ attribute: PortalCatalogAlgoliaSmartFacetAttribute; label: string; value: string }> {
  const chips: Array<{
    attribute: PortalCatalogAlgoliaSmartFacetAttribute;
    label: string;
    value: string;
  }> = [];
  for (const dimension of STUDIO_SMART_FILTER_DIMENSIONS) {
    for (const value of normalizeStudioAlgoliaSmartFilterValues(
      smartFilters[dimension.attribute] ?? [],
    )) {
      chips.push({
        attribute: dimension.attribute,
        label: dimension.label,
        value,
      });
    }
  }
  return chips;
}
