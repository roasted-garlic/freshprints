import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  CATALOG_NEW_THIS_WEEK_DAYS,
} from '@fresh-prints/shared/utils/catalogDiscoveryRanking';

import type { CatalogDesign } from '../types/catalog.types';
import {
  allowsBoundedCatalogFirestoreFallback,
  appendCatalogDesignPageWithoutDuplicates,
  buildDiscoverSearchPlaceholder,
  buildServerListQuery,
  fetchReadyDesignCountWithRetry,
  reconcilePagingWithAggregateCount,
  resolveOrdinaryMatchingCount,
  shouldShowOrdinaryCountPending,
  shouldShowOrdinaryCountUnavailable,
  sortFieldForDiscovery,
} from './useCatalogDesigns';

const DAY_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 40;

function design(partial: Partial<CatalogDesign> & Pick<CatalogDesign, 'id'>): CatalogDesign {
  return {
    title: partial.title ?? partial.id,
    tags: [],
    thumbnailPath: 't',
    width: 1,
    height: 1,
    requestCount: 0,
    favoriteCount: 0,
    readyAtMs: partial.readyAtMs ?? 1_000,
    ...partial,
  };
}

function designsFromIds(ids: string[], readyAtBase = 10_000): CatalogDesign[] {
  return ids.map((id, index) =>
    design({
      id,
      readyAtMs: readyAtBase - index,
    }),
  );
}

test('permits bounded Firestore ordinary browse for unfiltered, category, single-tag, and discovery', () => {
  assert.equal(allowsBoundedCatalogFirestoreFallback({ selectedTags: [] }), true);
  assert.equal(
    allowsBoundedCatalogFirestoreFallback({ categoryId: 'category-a', selectedTags: [] }),
    true,
  );
  assert.equal(
    allowsBoundedCatalogFirestoreFallback({ selectedTags: ['tag-a'] }),
    true,
  );
  assert.equal(
    allowsBoundedCatalogFirestoreFallback({ discoveryMode: 'new', selectedTags: [] }),
    true,
  );
  assert.equal(
    allowsBoundedCatalogFirestoreFallback({
      categoryId: 'category-a',
      discoveryMode: 'popular',
      selectedTags: ['tag-a'],
    }),
    true,
  );
});

test('keeps search, multi-tag, and smart filters off the ordinary Firestore path', () => {
  assert.equal(
    allowsBoundedCatalogFirestoreFallback({ searchQuery: 'best', selectedTags: [] }),
    false,
  );
  assert.equal(
    allowsBoundedCatalogFirestoreFallback({ selectedTags: ['tag-a', 'tag-b'] }),
    false,
  );
  assert.equal(
    allowsBoundedCatalogFirestoreFallback({
      categoryId: 'category-a',
      searchQuery: 'logo',
      selectedTags: [],
    }),
    false,
  );
  assert.equal(
    allowsBoundedCatalogFirestoreFallback({
      selectedTags: [],
      smartFilters: { subjects: ['cow'] },
    }),
    false,
  );
});

test('Discover new uses readyAt sort and readyAfterMs membership window', () => {
  assert.equal(sortFieldForDiscovery('new'), 'readyAt');
  assert.equal(sortFieldForDiscovery(null), 'readyAt');
  assert.equal(sortFieldForDiscovery('popular'), 'requestCount');
  assert.equal(sortFieldForDiscovery('mostLiked'), 'favoriteCount');
  assert.equal(sortFieldForDiscovery('recent'), 'lastAddedToShowAt');

  const before = Date.now();
  const query = buildServerListQuery({ discoveryMode: 'new', selectedTags: [] });
  const after = Date.now();

  assert.equal(query.sortField, 'readyAt');
  assert.equal(query.createdAfterMs, undefined);
  assert.equal(typeof query.readyAfterMs, 'number');
  assert.ok(query.readyAfterMs! <= before - CATALOG_NEW_THIS_WEEK_DAYS * DAY_MS + 5);
  assert.ok(query.readyAfterMs! >= after - CATALOG_NEW_THIS_WEEK_DAYS * DAY_MS - 5);
});

test('ordinary browse and metric Discover modes do not set readyAfterMs', () => {
  assert.equal(
    buildServerListQuery({ selectedTags: [] }).readyAfterMs,
    undefined,
  );
  assert.equal(
    buildServerListQuery({ discoveryMode: 'popular', selectedTags: [] }).readyAfterMs,
    undefined,
  );
  assert.equal(
    buildServerListQuery({ discoveryMode: 'mostLiked', selectedTags: [] }).sortField,
    'favoriteCount',
  );
  assert.equal(
    buildServerListQuery({ categoryId: 'cat-a', selectedTags: [] }).sortField,
    'readyAt',
  );
  assert.equal(
    buildServerListQuery({ selectedTags: ['tag-a'] }).sortField,
    'readyAt',
  );
  assert.equal(
    buildServerListQuery({ selectedTags: ['halftone'] }).tag,
    'halftone',
  );
});

test('Most Liked and Recently Requested set explicit eligibility flags', () => {
  const mostLiked = buildServerListQuery({ discoveryMode: 'mostLiked', selectedTags: [] });
  assert.equal(mostLiked.minFavoriteCount, 1);
  assert.equal(mostLiked.requireLastAddedToShowAt, undefined);

  const recent = buildServerListQuery({ discoveryMode: 'recent', selectedTags: [] });
  assert.equal(recent.requireLastAddedToShowAt, true);
  assert.equal(recent.minFavoriteCount, undefined);

  const popular = buildServerListQuery({ discoveryMode: 'popular', selectedTags: [] });
  assert.equal(popular.minFavoriteCount, undefined);
  assert.equal(popular.requireLastAddedToShowAt, undefined);

  const ntw = buildServerListQuery({ discoveryMode: 'new', selectedTags: [] });
  assert.equal(ntw.minFavoriteCount, undefined);
  assert.equal(ntw.requireLastAddedToShowAt, undefined);
});

test('Recently Requested: 2 eligible with matching aggregate → hasMore false (no Load more)', () => {
  const loaded = designsFromIds(['r1', 'r2']);
  const reconciled = reconcilePagingWithAggregateCount({
    loadedDesigns: loaded,
    listHasMore: false,
    listNextCursor: undefined,
    aggregateTotal: 2,
    sortField: 'lastAddedToShowAt',
  });
  assert.equal(reconciled.hasMore, false);
  assert.equal(reconciled.nextCursor, undefined);
  assert.equal(reconciled.isFullyHydrated, true);

  const badge = resolveOrdinaryMatchingCount({
    countAuthority: { status: 'resolved', total: 2 },
    loadedCount: 2,
    isFullyHydrated: true,
  });
  assert.equal(badge, 2);
});

test('Recently Requested: inflated all-ready aggregate still forced hasMore before eligibility fix pattern', () => {
  // Documents the bug class: when aggregate (all ready) exceeds eligible loaded set,
  // reconcile would force hasMore. After eligibility-scoped counts, aggregate matches loaded.
  const loaded = designsFromIds(['r1', 'r2']);
  const buggy = reconcilePagingWithAggregateCount({
    loadedDesigns: loaded,
    listHasMore: false,
    listNextCursor: undefined,
    aggregateTotal: 366,
    sortField: 'lastAddedToShowAt',
  });
  assert.equal(buggy.hasMore, true);

  const fixed = reconcilePagingWithAggregateCount({
    loadedDesigns: loaded,
    listHasMore: false,
    listNextCursor: undefined,
    aggregateTotal: 2,
    sortField: 'lastAddedToShowAt',
  });
  assert.equal(fixed.hasMore, false);
});

test('Recently Requested multi-page: first page of 40 with aggregate 45 keeps hasMore', () => {
  const page1 = designsFromIds(Array.from({ length: PAGE_SIZE }, (_, i) => `r${i + 1}`));
  const reconciled = reconcilePagingWithAggregateCount({
    loadedDesigns: page1,
    listHasMore: true,
    listNextCursor: { designId: 'r40', sortValue: page1[39]!.readyAtMs! },
    aggregateTotal: 45,
    sortField: 'lastAddedToShowAt',
  });
  assert.equal(reconciled.hasMore, true);
  assert.ok(reconciled.nextCursor);
});

test('A: 45-result NTW — badge authority is 45 while first page is 40', () => {
  const page1 = designsFromIds(Array.from({ length: PAGE_SIZE }, (_, i) => `d${i + 1}`));
  assert.equal(page1.length, 40);

  const badge = resolveOrdinaryMatchingCount({
    countAuthority: { status: 'resolved', total: 45 },
    loadedCount: page1.length,
    isFullyHydrated: false,
  });
  assert.equal(badge, 45);

  const reconciled = reconcilePagingWithAggregateCount({
    loadedDesigns: page1,
    listHasMore: true,
    listNextCursor: { designId: 'd40', sortValue: page1[39]!.readyAtMs! },
    aggregateTotal: 45,
    sortField: 'readyAt',
  });
  assert.equal(reconciled.hasMore, true);
  assert.ok(reconciled.nextCursor);
  assert.equal(reconciled.isFullyHydrated, false);
});

test('A: Load more appends remaining 5 without duplicates; final unique set = 45', () => {
  const page1Ids = Array.from({ length: 40 }, (_, i) => `d${i + 1}`);
  const page2Ids = Array.from({ length: 5 }, (_, i) => `d${i + 41}`);
  const page1 = designsFromIds(page1Ids);
  const page2 = designsFromIds(page2Ids, 100);

  const afterPage1 = appendCatalogDesignPageWithoutDuplicates([], page1);
  const afterPage2 = appendCatalogDesignPageWithoutDuplicates(afterPage1, [
    ...page2,
    page1[0]!, // intentional duplicate at boundary
  ]);

  assert.equal(afterPage1.length, 40);
  assert.equal(afterPage2.length, 45);
  assert.deepEqual(
    afterPage2.map((item) => item.id),
    [...page1Ids, ...page2Ids],
  );

  const end = reconcilePagingWithAggregateCount({
    loadedDesigns: afterPage2,
    listHasMore: false,
    listNextCursor: undefined,
    aggregateTotal: 45,
    sortField: 'readyAt',
  });
  assert.equal(end.hasMore, false);
  assert.equal(end.isFullyHydrated, true);
  assert.equal(
    resolveOrdinaryMatchingCount({
      countAuthority: { status: 'resolved', total: 45 },
      loadedCount: afterPage2.length,
      isFullyHydrated: true,
    }),
    45,
  );
});

test('B: 85-result fixture — 40 + 40 + 5 pages reach all unique ids', () => {
  const allIds = Array.from({ length: 85 }, (_, i) => `x${i + 1}`);
  const page1 = designsFromIds(allIds.slice(0, 40));
  const page2 = designsFromIds(allIds.slice(40, 80), 500);
  const page3 = designsFromIds(allIds.slice(80), 100);

  let loaded = appendCatalogDesignPageWithoutDuplicates([], page1);
  assert.equal(loaded.length, 40);
  assert.equal(
    resolveOrdinaryMatchingCount({
      countAuthority: { status: 'resolved', total: 85 },
      loadedCount: loaded.length,
      isFullyHydrated: false,
    }),
    85,
  );

  loaded = appendCatalogDesignPageWithoutDuplicates(loaded, page2);
  assert.equal(loaded.length, 80);

  loaded = appendCatalogDesignPageWithoutDuplicates(loaded, page3);
  assert.equal(loaded.length, 85);
  assert.deepEqual(
    loaded.map((item) => item.id),
    allIds,
  );

  const end = reconcilePagingWithAggregateCount({
    loadedDesigns: loaded,
    listHasMore: false,
    listNextCursor: undefined,
    aggregateTotal: 85,
    sortField: 'readyAt',
  });
  assert.equal(end.hasMore, false);
  assert.equal(end.isFullyHydrated, true);
});

test('C/D: page-boundary append never duplicates or drops prior ids', () => {
  const first = designsFromIds(['a', 'b', 'c']);
  const second = designsFromIds(['c', 'd', 'e'], 50);
  const merged = appendCatalogDesignPageWithoutDuplicates(first, second);
  assert.deepEqual(
    merged.map((item) => item.id),
    ['a', 'b', 'c', 'd', 'e'],
  );
});

test('E: filter change query keys differ — NTW vs category (reset contract)', () => {
  const ntw = buildServerListQuery({ discoveryMode: 'new', selectedTags: [] });
  const category = buildServerListQuery({
    categoryId: 'funny',
    selectedTags: [],
  });
  assert.notEqual(ntw.readyAfterMs, undefined);
  assert.equal(category.readyAfterMs, undefined);
  assert.equal(category.categoryId, 'funny');
  assert.notEqual(JSON.stringify(ntw), JSON.stringify(category));
});

test('F/G: category and single-tag / Halftone queries stay on ordinary path with membership fields', () => {
  const category = buildServerListQuery({
    categoryId: 'cat-big',
    selectedTags: [],
  });
  const tag = buildServerListQuery({ selectedTags: ['halftone'] });
  assert.equal(allowsBoundedCatalogFirestoreFallback({ categoryId: 'cat-big', selectedTags: [] }), true);
  assert.equal(allowsBoundedCatalogFirestoreFallback({ selectedTags: ['halftone'] }), true);
  assert.equal(category.categoryId, 'cat-big');
  assert.equal(tag.tag, 'halftone');
  assert.equal(category.sortField, 'readyAt');
  assert.equal(tag.sortField, 'readyAt');
});

test('H: count failure — badge not loaded-page length; retry then fail; list still independent', async () => {
  assert.equal(
    resolveOrdinaryMatchingCount({
      countAuthority: { status: 'failed' },
      loadedCount: 40,
      isFullyHydrated: false,
    }),
    null,
  );
  // Failed must NOT look like infinite “Counting designs…”
  assert.equal(
    shouldShowOrdinaryCountPending({
      countAuthority: { status: 'failed' },
      isFullyHydrated: false,
    }),
    false,
  );
  assert.equal(
    shouldShowOrdinaryCountUnavailable({
      countAuthority: { status: 'failed' },
      matchingCount: null,
    }),
    true,
  );
  // Once all pages loaded, loaded count is honest membership.
  assert.equal(
    resolveOrdinaryMatchingCount({
      countAuthority: { status: 'failed' },
      loadedCount: 45,
      isFullyHydrated: true,
    }),
    45,
  );
  assert.equal(
    shouldShowOrdinaryCountUnavailable({
      countAuthority: { status: 'failed' },
      matchingCount: 45,
    }),
    false,
  );

  let attempts = 0;
  const failed = await fetchReadyDesignCountWithRetry(async () => {
    attempts += 1;
    throw new Error('failed-precondition: missing index');
  }, {});
  assert.equal(failed.ok, false);
  assert.equal(attempts, 2);

  attempts = 0;
  const recovered = await fetchReadyDesignCountWithRetry(async () => {
    attempts += 1;
    if (attempts === 1) {
      throw new Error('transient');
    }
    return 45;
  }, {});
  assert.equal(recovered.ok, true);
  if (recovered.ok) {
    assert.equal(recovered.total, 45);
  }
  assert.equal(attempts, 2);
});

test('D: pending shows Counting; E: failed shows Count unavailable contract', () => {
  assert.equal(
    shouldShowOrdinaryCountPending({
      countAuthority: { status: 'pending' },
      isFullyHydrated: false,
    }),
    true,
  );
  assert.equal(
    shouldShowOrdinaryCountUnavailable({
      countAuthority: { status: 'pending' },
      matchingCount: null,
    }),
    false,
  );
  assert.equal(
    shouldShowOrdinaryCountPending({
      countAuthority: { status: 'resolved', total: 45 },
      isFullyHydrated: false,
    }),
    false,
  );
  assert.equal(
    resolveOrdinaryMatchingCount({
      countAuthority: { status: 'resolved', total: 45 },
      loadedCount: 40,
      isFullyHydrated: false,
    }),
    45,
  );
});

test('reconcile restores Load more when aggregate > loaded but list claimed end', () => {
  const page1 = designsFromIds(Array.from({ length: 40 }, (_, i) => `r${i + 1}`));
  const reconciled = reconcilePagingWithAggregateCount({
    loadedDesigns: page1,
    listHasMore: false,
    listNextCursor: undefined,
    aggregateTotal: 45,
    sortField: 'readyAt',
  });
  assert.equal(reconciled.hasMore, true);
  assert.equal(reconciled.isFullyHydrated, false);
  assert.equal(reconciled.nextCursor?.designId, 'r40');
  assert.equal(reconciled.nextCursor?.sortValue, page1[39]!.readyAtMs);
});

test('pending count shows Counting… state and never uses loaded length as authority', () => {
  assert.equal(
    resolveOrdinaryMatchingCount({
      countAuthority: { status: 'pending' },
      loadedCount: 40,
      isFullyHydrated: false,
    }),
    null,
  );
  assert.equal(
    shouldShowOrdinaryCountPending({
      countAuthority: { status: 'pending' },
      isFullyHydrated: false,
    }),
    true,
  );
});

test('CatalogPageContent surfaces Count unavailable for failed incomplete aggregate', () => {
  const page = readFileSync(
    'apps/portal/features/catalog/pages/CatalogPageContent.tsx',
    'utf8',
  );
  assert.match(page, /isCountUnavailable/);
  assert.match(page, /Count unavailable/);
  assert.match(page, /Counting designs…/);
});

test('I/K containment: ordinary path no longer seeds badge from firstPage.designs.length', () => {
  const source = readFileSync('apps/portal/features/catalog/hooks/useCatalogDesigns.ts', 'utf8');
  assert.doesNotMatch(source, /setServerTotalCount\(firstPage\.designs\.length\)/);
  assert.match(source, /fetchReadyDesignCountWithRetry/);
  assert.match(source, /reconcilePagingWithAggregateCount/);
  assert.match(source, /resolveOrdinaryMatchingCount/);
  // Managed search / Algolia path preserved.
  assert.match(source, /portalAlgoliaCatalogSearchService/);
  assert.match(source, /requiresManagedSearchPath|useManagedSearch/);
});

test('J containment: Home rails still use listHomeDiscoveryPool; placeholder count is independent aggregate', () => {
  const source = readFileSync('apps/portal/features/catalog/hooks/useCatalogDesigns.ts', 'utf8');
  const homeStart = source.indexOf('export function useCatalogHomeDesigns');
  const homeEnd = source.indexOf('export function useFilteredCatalogDesigns');
  const homeBlock = source.slice(homeStart, homeEnd >= 0 ? homeEnd : homeStart + 4500);
  assert.match(homeBlock, /listHomeDiscoveryPool/);
  assert.match(homeBlock, /fetchReadyDesignCountWithRetry/);
  assert.match(homeBlock, /countReadyDesigns/);
  assert.match(homeBlock, /readyLibraryCount/);
  // Aggregate failure must not advertise pool length.
  assert.match(homeBlock, /Never fall back to hydrated home-pool length/);
  // Category rails: select from pool then hydrate via bounded category list.
  assert.match(homeBlock, /selectTopPopularCategoryRails/);
  assert.match(homeBlock, /listReadyDesignsPageWithSortFallback/);
  assert.match(homeBlock, /CATALOG_DISCOVERY_RAIL_LIMIT/);
});

test('CatalogHomePageContent consumes hydrated category rails (not pool-only designs)', () => {
  const page = readFileSync(
    'apps/portal/features/catalog/pages/CatalogHomePageContent.tsx',
    'utf8',
  );
  assert.match(page, /hydratedCategoryRails|categoryRails:/);
  assert.match(page, /useCatalogHomeDesigns\(categories\)/);
  assert.doesNotMatch(page, /selectTopPopularCategoryRails\(designs/);
});

test('Discover search placeholder uses aggregate readyLibraryCount, never designs.length', () => {
  const page = readFileSync(
    'apps/portal/features/catalog/pages/CatalogHomePageContent.tsx',
    'utf8',
  );
  assert.match(page, /buildDiscoverSearchPlaceholder\(readyLibraryCount\)/);
  assert.doesNotMatch(page, /designs\.length\s*\|\|/);
  assert.doesNotMatch(page, /readyDesignCount\s*=\s*designs\.length/);
});

test('buildDiscoverSearchPlaceholder: singular, locale thousands, and null fallback', () => {
  assert.equal(buildDiscoverSearchPlaceholder(null), 'title, tag or description');
  assert.equal(buildDiscoverSearchPlaceholder(1), 'Search 1 design, by title, tag or description');
  assert.equal(
    buildDiscoverSearchPlaceholder(85),
    `Search ${(85).toLocaleString()} designs, by title, tag or description`,
  );
  assert.equal(
    buildDiscoverSearchPlaceholder(1243),
    `Search ${(1243).toLocaleString()} designs, by title, tag or description`,
  );
  // Bounded home pool of 85 must not be forced into the placeholder when total is larger.
  const homePoolLength = 85;
  const authoritativeTotal = 1243;
  assert.notEqual(
    buildDiscoverSearchPlaceholder(authoritativeTotal),
    buildDiscoverSearchPlaceholder(homePoolLength),
  );
});

test('CLIENT_SORT_MEMBERSHIP_CAP residual remains 500 in catalogService (unchanged this phase)', () => {
  const service = readFileSync('apps/portal/features/catalog/services/catalogService.ts', 'utf8');
  assert.match(service, /CLIENT_SORT_MEMBERSHIP_CAP = 500/);
  assert.match(service, /DEFAULT_CATALOG_PAGE_SIZE = 40/);
});
