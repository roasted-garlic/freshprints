import assert from 'node:assert/strict';
import test from 'node:test';

import { allowsBoundedCatalogFirestoreFallback } from './useCatalogDesigns';

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
