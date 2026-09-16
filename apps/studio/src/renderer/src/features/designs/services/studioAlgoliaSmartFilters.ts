import {
  buildPortalCatalogAlgoliaSmartFacetFilters,
  PORTAL_CATALOG_ALGOLIA_SMART_FACET_ATTRIBUTES,
  normalizePortalCatalogAlgoliaSmartFilterValues,
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

export function buildStudioSmartFacetDisplayOptions(args: {
  distribution: StudioAlgoliaSmartFacetOption[];
  searchQuery?: string;
  selectedValues?: readonly string[];
}): Array<StudioAlgoliaSmartFacetOption & { isSelected: boolean }> {
  const selected = new Set(normalizeStudioAlgoliaSmartFilterValues(args.selectedValues ?? []));
  const query = args.searchQuery?.trim().toLowerCase() ?? "";
  const candidates = args.distribution
    .filter((option) => !query || option.value.toLowerCase().includes(query))
    .map((option) => ({ ...option }));
  const visible = new Set(candidates.map((option) => option.value));
  for (const value of selected) {
    if (!visible.has(value) && (!query || value.includes(query))) {
      candidates.push({ value, count: 0 });
    }
  }
  return candidates.map((option) => ({ ...option, isSelected: selected.has(option.value) }));
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

export function normalizeStudioAlgoliaSmartFilterValuesForAttribute(
  attribute: PortalCatalogAlgoliaSmartFacetAttribute,
  values: readonly string[],
): string[] {
  return normalizePortalCatalogAlgoliaSmartFilterValues(attribute, values);
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
    total += normalizeStudioAlgoliaSmartFilterValuesForAttribute(
      attribute,
      smartFilters[attribute] ?? [],
    ).length;
  }
  return total;
}

/** Stable dependency key for React effects (order-independent within each attribute). */
export function serializeStudioAlgoliaSmartFilters(
  smartFilters: StudioAlgoliaSmartFilters | undefined,
): string {
  if (!smartFilters) return "";
  return PORTAL_CATALOG_ALGOLIA_SMART_FACET_ATTRIBUTES.map((attribute) => {
    const values = normalizeStudioAlgoliaSmartFilterValuesForAttribute(
      attribute,
      smartFilters[attribute] ?? [],
    ).sort((left, right) => left.localeCompare(right));
    return `${attribute}=${values.join("\u0001")}`;
  }).join("\u0000");
}

/**
 * Algolia facet filter groups for Smart dimensions.
 * Within a dimension selected values are cumulative (AND); dimensions remain AND.
 * Objects / searchConcepts / visibleText are never faceted here.
 */
export function buildStudioAlgoliaSmartFacetFilters(
  smartFilters: StudioAlgoliaSmartFilters | undefined,
): string[][] {
  return buildPortalCatalogAlgoliaSmartFacetFilters(smartFilters);
}

export function mergeStudioAlgoliaSmartFacetDistribution(
  distribution: Record<string, number> | undefined,
  attribute?: PortalCatalogAlgoliaSmartFacetAttribute,
): StudioAlgoliaSmartFacetOption[] {
  if (!distribution) return [];
  const merged = new Map<string, number>();
  for (const [value, count] of Object.entries(distribution)) {
    if (count <= 0) continue;
    const canonical = attribute
      ? normalizeStudioAlgoliaSmartFilterValuesForAttribute(attribute, [value])[0]
      : value;
    if (!canonical) continue;
    merged.set(canonical, (merged.get(canonical) ?? 0) + count);
  }
  return [...merged.entries()]
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
    const selected = normalizeStudioAlgoliaSmartFilterValuesForAttribute(
      attribute,
      smartFilters?.[attribute] ?? [],
    );
    if (selected.length === 0) continue;
    const values = normalizeStudioAlgoliaSmartFilterValuesForAttribute(
      attribute,
      profile?.[attribute] ?? [],
    );
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
    for (const value of normalizeStudioAlgoliaSmartFilterValuesForAttribute(
      dimension.attribute,
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
