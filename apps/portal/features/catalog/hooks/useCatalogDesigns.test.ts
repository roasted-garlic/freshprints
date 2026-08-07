import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CATALOG_NEW_THIS_WEEK_DAYS,
} from '@fresh-prints/shared/utils/catalogDiscoveryRanking';

import {
  allowsBoundedCatalogFirestoreFallback,
  buildServerListQuery,
  sortFieldForDiscovery,
} from './useCatalogDesigns';

const DAY_MS = 24 * 60 * 60 * 1000;

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

test('keeps search and multi-tag off the ordinary Firestore path until Phase 1B', () => {
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
});
