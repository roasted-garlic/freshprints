import assert from 'node:assert/strict';
import test from 'node:test';

import { allowsBoundedCatalogFirestoreFallback } from './useCatalogDesigns';

test('permits the bounded Firestore fallback only for plain browse', () => {
  assert.equal(allowsBoundedCatalogFirestoreFallback({ selectedTags: [] }), true);
  assert.equal(
    allowsBoundedCatalogFirestoreFallback({ categoryId: 'category-a', selectedTags: [] }),
    false,
  );
  assert.equal(
    allowsBoundedCatalogFirestoreFallback({ searchQuery: 'best', selectedTags: [] }),
    false,
  );
  assert.equal(
    allowsBoundedCatalogFirestoreFallback({ selectedTags: ['tag-a'] }),
    false,
  );
  assert.equal(
    allowsBoundedCatalogFirestoreFallback({ discoveryMode: 'new', selectedTags: [] }),
    false,
  );
});
