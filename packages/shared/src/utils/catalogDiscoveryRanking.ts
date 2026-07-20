/** Discovery mode keys for Portal Design Library (URL `discover=`). Phase 10 may swap ranking only. */
export type CatalogDiscoveryMode = "new" | "popular" | "mostLiked" | "recent";

export const CATALOG_DISCOVERY_MODES: readonly CatalogDiscoveryMode[] = [
  "new",
  "popular",
  "mostLiked",
  "recent",
];

export const CATALOG_DISCOVERY_RAIL_LIMIT = 25;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const CATALOG_NEW_THIS_WEEK_DAYS = 7;

/** Minimal design fields needed for discovery ranking. */
export interface CatalogDiscoveryDesign {
  id: string;
  categoryId?: string;
  createdAtMs?: number;
  requestCount: number;
  favoriteCount?: number;
  lastRequestedAtMs?: number;
}

/** Max category carousels on Discover (most popular only). */
export const CATALOG_POPULAR_CATEGORY_RAIL_LIMIT = 3;

/** Category must have at least this many ready designs to earn a rail. */
export const CATALOG_POPULAR_CATEGORY_MIN_DESIGNS = 3;

export interface CatalogCategoryRef {
  id: string;
  name: string;
}

export interface CatalogPopularCategoryRail<T extends CatalogDiscoveryDesign> {
  categoryId: string;
  name: string;
  totalRequestCount: number;
  designCount: number;
  designs: T[];
}

export function parseCatalogDiscoveryMode(value: string | null | undefined): CatalogDiscoveryMode | null {
  if (value === "new" || value === "popular" || value === "mostLiked" || value === "recent") {
    return value;
  }

  return null;
}

export function getCatalogDiscoveryModeLabel(mode: CatalogDiscoveryMode): string {
  switch (mode) {
    case "new":
      return "New This Week";
    case "popular":
      return "Popular";
    case "mostLiked":
      return "Most Liked";
    case "recent":
      return "Recently Requested";
  }
}

function compareById(left: CatalogDiscoveryDesign, right: CatalogDiscoveryDesign): number {
  return left.id.localeCompare(right.id);
}

/** Designs created within the last 7 days, newest first. */
export function rankNewThisWeek<T extends CatalogDiscoveryDesign>(
  designs: readonly T[],
  nowMs: number = Date.now(),
): T[] {
  const cutoffMs = nowMs - CATALOG_NEW_THIS_WEEK_DAYS * MS_PER_DAY;

  return designs
    .filter((design) => design.createdAtMs !== undefined && design.createdAtMs >= cutoffMs)
    .slice()
    .sort((left, right) => {
      const createdCompare = (right.createdAtMs ?? 0) - (left.createdAtMs ?? 0);
      if (createdCompare !== 0) {
        return createdCompare;
      }

      return compareById(left, right);
    });
}

/**
 * Studio-newest first (design `createdAt` desc). Used for default library and
 * non-metric home rails so request/like counters never reshuffle the grid.
 */
export function rankNewestStudioFirst<T extends CatalogDiscoveryDesign>(designs: readonly T[]): T[] {
  return designs.slice().sort((left, right) => {
    const createdCompare = (right.createdAtMs ?? 0) - (left.createdAtMs ?? 0);
    if (createdCompare !== 0) {
      return createdCompare;
    }

    return compareById(left, right);
  });
}

/** Lifetime popularity: requestCount descending. */
export function rankPopular<T extends CatalogDiscoveryDesign>(designs: readonly T[]): T[] {
  return designs.slice().sort((left, right) => {
    const countCompare = right.requestCount - left.requestCount;
    if (countCompare !== 0) {
      return countCompare;
    }

    return compareById(left, right);
  });
}

/** Lifetime favorites: favoriteCount descending (Most Liked rail). */
export function rankMostLiked<T extends CatalogDiscoveryDesign>(designs: readonly T[]): T[] {
  return designs
    .filter((design) => (design.favoriteCount ?? 0) > 0)
    .slice()
    .sort((left, right) => {
      const countCompare = (right.favoriteCount ?? 0) - (left.favoriteCount ?? 0);
      if (countCompare !== 0) {
        return countCompare;
      }

      return compareById(left, right);
    });
}

/**
 * Lightweight “recently requested” proxy (not true 7-day trending).
 * Phase 10 may replace this function’s body without changing the UI contract.
 */
export function rankRecentlyRequested<T extends CatalogDiscoveryDesign>(designs: readonly T[]): T[] {
  return designs
    .filter((design) => design.lastRequestedAtMs !== undefined)
    .slice()
    .sort((left, right) => {
      const recentCompare = (right.lastRequestedAtMs ?? 0) - (left.lastRequestedAtMs ?? 0);
      if (recentCompare !== 0) {
        return recentCompare;
      }

      const countCompare = right.requestCount - left.requestCount;
      if (countCompare !== 0) {
        return countCompare;
      }

      return compareById(left, right);
    });
}

export function rankCatalogDiscoveryDesigns<T extends CatalogDiscoveryDesign>(
  designs: readonly T[],
  mode: CatalogDiscoveryMode,
  nowMs: number = Date.now(),
): T[] {
  switch (mode) {
    case "new":
      return rankNewThisWeek(designs, nowMs);
    case "popular":
      return rankPopular(designs);
    case "mostLiked":
      return rankMostLiked(designs);
    case "recent":
      return rankRecentlyRequested(designs);
  }
}

export function takeCatalogDiscoveryRail<T>(designs: readonly T[], limit = CATALOG_DISCOVERY_RAIL_LIMIT): T[] {
  return designs.slice(0, limit);
}

/**
 * Build Discover carousels for the most popular categories.
 * Popularity = sum of design `requestCount` (tie-break: design count, then name).
 */
export function selectTopPopularCategoryRails<T extends CatalogDiscoveryDesign>(
  designs: readonly T[],
  categories: readonly CatalogCategoryRef[],
  options?: {
    maxRails?: number;
    minDesigns?: number;
    railLimit?: number;
  },
): CatalogPopularCategoryRail<T>[] {
  const maxRails = options?.maxRails ?? CATALOG_POPULAR_CATEGORY_RAIL_LIMIT;
  const minDesigns = options?.minDesigns ?? CATALOG_POPULAR_CATEGORY_MIN_DESIGNS;
  const railLimit = options?.railLimit ?? CATALOG_DISCOVERY_RAIL_LIMIT;

  if (maxRails <= 0 || categories.length === 0) {
    return [];
  }

  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));
  const designsByCategoryId = new Map<string, T[]>();

  for (const design of designs) {
    const categoryId = design.categoryId?.trim();
    if (!categoryId || !categoryNameById.has(categoryId)) {
      continue;
    }

    const bucket = designsByCategoryId.get(categoryId);
    if (bucket) {
      bucket.push(design);
    } else {
      designsByCategoryId.set(categoryId, [design]);
    }
  }

  const rankedCategories = [...designsByCategoryId.entries()]
    .map(([categoryId, categoryDesigns]) => {
      const totalRequestCount = categoryDesigns.reduce((sum, design) => sum + design.requestCount, 0);
      const name = categoryNameById.get(categoryId) ?? categoryId;

      return {
        categoryId,
        name,
        totalRequestCount,
        designCount: categoryDesigns.length,
        // Category sections are not metric collections — cards stay Studio-newest.
        designs: takeCatalogDiscoveryRail(rankNewestStudioFirst(categoryDesigns), railLimit),
      };
    })
    .filter((entry) => entry.designCount >= minDesigns)
    .sort((left, right) => {
      const requestCompare = right.totalRequestCount - left.totalRequestCount;
      if (requestCompare !== 0) {
        return requestCompare;
      }

      const countCompare = right.designCount - left.designCount;
      if (countCompare !== 0) {
        return countCompare;
      }

      return left.name.localeCompare(right.name);
    });

  return rankedCategories.slice(0, maxRails);
}
