import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  computeNarrowedTagFacets,
  intersectDesignIdLists,
  planPortalCatalogSearchPage,
  searchShardKeyForTerm,
  tokenize,
} from './portalCatalogAssetService';

describe('portalCatalogAssetService search pagination', () => {
  it('reproduces and fixes the owner-reported BEST regression: both matches appear on the first page', () => {
    // "Best Christmas Ever Castle" and "We Are More Than Bestie..." both contain the
    // substring "best" — both land in the same generated search shard ("be") because the
    // shard key is derived from the matched term itself, not the source word.
    const bestChristmasCastleId = 'design-best-christmas-castle';
    const bestieId = 'design-bestie-tote';
    // Order as the publisher would write it: "Studio-newest first" (createdAt DESC). Here the
    // castle design was created after the bestie design, so it appears first.
    const shardTermMatches = [bestChristmasCastleId, bestieId];
    const { pageIds, total } = planPortalCatalogSearchPage([shardTermMatches], { limit: 40 });
    assert.equal(total, 2);
    assert.equal(pageIds.length, 2);
    assert.ok(pageIds.includes(bestChristmasCastleId));
    assert.ok(pageIds.includes(bestieId));
  });

  it('does not require Load more when the complete result has exactly 2 matches', () => {
    const { pageIds, total } = planPortalCatalogSearchPage(
      [['design-a', 'design-b']],
      { limit: 40, offset: 0 },
    );
    // hasMore in the consuming hook is derived from designs.length < total; both must be equal.
    assert.equal(pageIds.length, total);
  });

  it('shows all 40 results with no Load more when exactly 40 designs match', () => {
    const ids = Array.from({ length: 40 }, (_, index) => `design-${String(index).padStart(3, '0')}`);
    const { pageIds, total } = planPortalCatalogSearchPage([ids], { limit: 40 });
    assert.equal(total, 40);
    assert.equal(pageIds.length, 40);
  });

  it('shows 40 results and requires Load more when 41 designs match', () => {
    const ids = Array.from({ length: 41 }, (_, index) => `design-${String(index).padStart(3, '0')}`);
    const { pageIds, total } = planPortalCatalogSearchPage([ids], { limit: 40 });
    assert.equal(total, 41);
    assert.equal(pageIds.length, 40);
    assert.ok(pageIds.length < total);
  });

  it('Load more (offset 40) returns exactly the one remaining result with no duplicates', () => {
    const ids = Array.from({ length: 41 }, (_, index) => `design-${String(index).padStart(3, '0')}`);
    const firstPage = planPortalCatalogSearchPage([ids], { limit: 40, offset: 0 });
    const secondPage = planPortalCatalogSearchPage([ids], { limit: 40, offset: 40 });
    assert.equal(secondPage.pageIds.length, 1);
    const combined = new Set([...firstPage.pageIds, ...secondPage.pageIds]);
    assert.equal(combined.size, 41);
  });

  it('preserves the publisher-supplied order (Studio-newest-first, design-ID tiebreaker) — never re-sorts alphabetically', () => {
    // The publisher writes every candidate list already ordered "createdAt DESC, id DESC" (the
    // same convention as catalogService.ts's orderBy(sortField, 'desc'), orderBy('__name__', 'desc')).
    // planPortalCatalogSearchPage must preserve that relative order, not replace it with an
    // alphabetical design-ID sort — "design-zebra" here is the newest design and must stay first.
    const publisherOrder = ['design-zebra', 'design-mango', 'design-apple'];
    const { pageIds } = planPortalCatalogSearchPage([publisherOrder], { limit: 40 });
    assert.deepEqual(pageIds, ['design-zebra', 'design-mango', 'design-apple']);
  });

  it('produces a deterministic result across repeated calls with identically-ordered input', () => {
    const ids = ['design-zebra', 'design-mango', 'design-apple'];
    const first = planPortalCatalogSearchPage([ids], { limit: 40 });
    const second = planPortalCatalogSearchPage([[...ids]], { limit: 40 });
    assert.deepEqual(first.pageIds, second.pageIds);
  });

  it('AND-intersects multiple candidate lists (tag + category + search term) before pagination, preserving order', () => {
    // All three lists share the same publisher-assigned relative order for their common members.
    const tagMatches = ['design-c', 'design-b', 'design-a'];
    const categoryMatches = ['design-d', 'design-c', 'design-b'];
    const searchMatches = ['design-b', 'design-e'];
    const { pageIds, total } = planPortalCatalogSearchPage(
      [tagMatches, categoryMatches, searchMatches],
      { limit: 40 },
    );
    assert.equal(total, 1);
    assert.deepEqual(pageIds, ['design-b']);
  });

  it('matches spread across multiple candidate lists of different lengths still preserve order and completeness', () => {
    // Simulates matches distributed across different search shards / card buckets: each candidate
    // list independently carries a subset of the full browse order, and the intersection must
    // still surface every true match on the first page (no per-shard/per-bucket pre-slicing).
    const shardOne = ['design-newest', 'design-mid', 'design-oldest'];
    const shardTwo = ['design-newest', 'design-oldest'];
    const { pageIds, total } = planPortalCatalogSearchPage([shardOne, shardTwo], { limit: 40 });
    assert.equal(total, 2);
    assert.deepEqual(pageIds, ['design-newest', 'design-oldest']);
  });

  it('deduplicates a repeated ID within a single candidate list without double-counting', () => {
    const { pageIds, total } = planPortalCatalogSearchPage(
      [['design-a', 'design-a', 'design-b']],
      { limit: 40 },
    );
    assert.equal(total, 2);
    assert.deepEqual(pageIds, ['design-a', 'design-b']);
  });

  it('returns no results when there are no candidate lists at all', () => {
    const { pageIds, total } = planPortalCatalogSearchPage([], { limit: 40 });
    assert.equal(total, 0);
    assert.deepEqual(pageIds, []);
  });

  it('search shard key derivation matches the publisher exactly (first two characters of the term)', () => {
    assert.equal(searchShardKeyForTerm('best'), 'be');
    assert.equal(searchShardKeyForTerm('bestie'), 'be');
    assert.equal(searchShardKeyForTerm('a'), 'a_');
    assert.equal(searchShardKeyForTerm('123'), '12');
  });

  it('tokenize is case-insensitive and deduplicates repeated words', () => {
    assert.deepEqual(tokenize('BEST best Best'), ['best']);
    assert.deepEqual(tokenize('Best Christmas Ever'), ['best', 'christmas', 'ever']);
  });
});

function card(tags: string[]): { tags: string[] } {
  return { tags };
}

describe('intersectDesignIdLists', () => {
  it('returns the empty list when given no lists at all', () => {
    assert.deepEqual(intersectDesignIdLists([]), []);
  });

  it('returns a single list unchanged (deduplicated) when only one tag is selected', () => {
    assert.deepEqual(
      intersectDesignIdLists([['design-a', 'design-a', 'design-b']]),
      ['design-a', 'design-b'],
    );
  });

  it('AND-intersects two lists, keeping only IDs present in both', () => {
    assert.deepEqual(
      intersectDesignIdLists([
        ['design-a', 'design-b', 'design-c'],
        ['design-b', 'design-c', 'design-d'],
      ]),
      ['design-b', 'design-c'],
    );
  });

  it('returns an empty result when the intersection is empty', () => {
    assert.deepEqual(intersectDesignIdLists([['design-a'], ['design-b']]), []);
  });
});

describe('computeNarrowedTagFacets (dynamic tag-modal narrowing)', () => {
  it('with no selected tags, returns an empty result (global facet list is a separate call)', () => {
    const result = computeNarrowedTagFacets([], [], new Map(), new Map());
    assert.deepEqual(result, []);
  });

  it('the worked example: selecting christmas (6 designs) surfaces disney (3), cute (2), not football (0)', () => {
    const christmasDesigns = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6'];
    const cardsById = new Map([
      ['d1', card(['christmas', 'disney'])],
      ['d2', card(['christmas', 'disney'])],
      ['d3', card(['christmas', 'disney'])],
      ['d4', card(['christmas', 'cute'])],
      ['d5', card(['christmas', 'cute'])],
      ['d6', card(['christmas'])],
    ]);
    const tagNameById = new Map([
      ['christmas', 'christmas'],
      ['disney', 'disney'],
      ['cute', 'cute'],
      ['football', 'football'],
    ]);
    const result = computeNarrowedTagFacets(['christmas'], christmasDesigns, cardsById, tagNameById);
    const byId = new Map(result.map((entry) => [entry.id, entry]));
    assert.equal(byId.get('christmas')?.count, 6);
    assert.equal(byId.get('disney')?.count, 3);
    assert.equal(byId.get('cute')?.count, 2);
    assert.ok(!byId.has('football'), 'zero-result candidate tags must not appear');
  });

  it('applies AND semantics across two selected tags, recalculating from the doubly-matching set', () => {
    // christmas ∩ disney = {d1, d2, d3}; of those, d1/d2 also have "movie", d3 has "sally" only.
    const matchingIds = ['d1', 'd2', 'd3'];
    const cardsById = new Map([
      ['d1', card(['christmas', 'disney', 'movie'])],
      ['d2', card(['christmas', 'disney', 'movie'])],
      ['d3', card(['christmas', 'disney', 'sally'])],
    ]);
    const tagNameById = new Map([
      ['christmas', 'christmas'],
      ['disney', 'disney'],
      ['movie', 'movie'],
      ['sally', 'sally'],
    ]);
    const result = computeNarrowedTagFacets(
      ['christmas', 'disney'],
      matchingIds,
      cardsById,
      tagNameById,
    );
    const byId = new Map(result.map((entry) => [entry.id, entry]));
    assert.equal(byId.get('christmas')?.count, 3);
    assert.equal(byId.get('disney')?.count, 3);
    assert.equal(byId.get('movie')?.count, 2);
    assert.equal(byId.get('sally')?.count, 1);
  });

  it('selected tags remain visible even when no additional candidate tag survives', () => {
    const result = computeNarrowedTagFacets(
      ['christmas'],
      ['d1'],
      new Map([['d1', card(['christmas'])]]),
      new Map([['christmas', 'christmas']]),
    );
    assert.deepEqual(
      result.map((entry) => entry.id),
      ['christmas'],
    );
    assert.equal(result[0]?.count, 1);
  });

  it('duplicate tag IDs on one design do not inflate the candidate count', () => {
    const result = computeNarrowedTagFacets(
      ['christmas'],
      ['d1'],
      new Map([['d1', card(['christmas', 'disney', 'disney', 'disney'])]]),
      new Map([
        ['christmas', 'christmas'],
        ['disney', 'disney'],
      ]),
    );
    const disney = result.find((entry) => entry.id === 'disney');
    assert.equal(disney?.count, 1);
  });

  it('a matching design ID with no resolved card contributes nothing (missing bucket entry)', () => {
    const result = computeNarrowedTagFacets(
      ['christmas'],
      ['d1', 'd2'],
      new Map([['d1', card(['christmas', 'disney'])]]),
      new Map([
        ['christmas', 'christmas'],
        ['disney', 'disney'],
      ]),
    );
    assert.equal(result.find((entry) => entry.id === 'christmas')?.count, 2);
    assert.equal(result.find((entry) => entry.id === 'disney')?.count, 1);
  });

  it('sorts results by tag name', () => {
    const result = computeNarrowedTagFacets(
      ['christmas'],
      ['d1'],
      new Map([['d1', card(['christmas', 'zebra', 'apple'])]]),
      new Map([
        ['christmas', 'christmas'],
        ['zebra', 'zebra'],
        ['apple', 'apple'],
      ]),
    );
    assert.deepEqual(
      result.map((entry) => entry.id),
      ['apple', 'christmas', 'zebra'],
    );
  });
});
