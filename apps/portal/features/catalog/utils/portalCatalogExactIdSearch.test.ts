import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { CatalogDesign } from '../types/catalog.types';
import {
  exactIdDesignMatchesCatalogFilters,
  looksLikeDesignDocumentId,
  mergeExactIdCatalogDesign,
} from './portalCatalogExactIdSearch';

function createDesign(overrides: Partial<CatalogDesign> = {}): CatalogDesign {
  return {
    id: 'AbCdEfGhIjKlMnOpQrSt',
    title: 'Summer Logo',
    tags: ['summer'],
    thumbnailPath: '/thumbnails/design-1.webp',
    width: 3000,
    height: 3000,
    requestCount: 0,
    favoriteCount: 0,
    ...overrides,
  };
}

describe('looksLikeDesignDocumentId', () => {
  it('accepts a 20-character Firestore-style id', () => {
    assert.equal(looksLikeDesignDocumentId('AbCdEfGhIjKlMnOpQrSt'), true);
  });

  it('rejects titles, short tokens, and whitespace', () => {
    assert.equal(looksLikeDesignDocumentId('summer'), false);
    assert.equal(looksLikeDesignDocumentId('design-1'), false);
    assert.equal(looksLikeDesignDocumentId('AbCd EfGhIjKlMnOpQrSt'), false);
    assert.equal(looksLikeDesignDocumentId(''), false);
  });
});

describe('exactIdDesignMatchesCatalogFilters', () => {
  it('respects category and tag filters', () => {
    const design = createDesign({ categoryId: 'animals', tags: ['ocean', 'sunset'] });

    assert.equal(
      exactIdDesignMatchesCatalogFilters(design, { categoryId: 'animals', selectedTags: [] }),
      true,
    );
    assert.equal(
      exactIdDesignMatchesCatalogFilters(design, { categoryId: 'nature', selectedTags: [] }),
      false,
    );
    assert.equal(
      exactIdDesignMatchesCatalogFilters(design, {
        selectedTags: ['ocean', 'sunset'],
      }),
      true,
    );
    assert.equal(
      exactIdDesignMatchesCatalogFilters(design, { selectedTags: ['ocean', 'halftone'] }),
      false,
    );
  });
});

describe('mergeExactIdCatalogDesign', () => {
  it('prepends a missing exact-id hit and ignores duplicates/null', () => {
    const existing = [createDesign({ id: 'aaaaaaaaaaaaaaaaaaaa', title: 'A' })];
    const extra = createDesign({ id: 'bbbbbbbbbbbbbbbbbbbb', title: 'B' });
    const merged = mergeExactIdCatalogDesign(existing, extra);

    assert.deepEqual(
      merged.map((design) => design.id),
      ['bbbbbbbbbbbbbbbbbbbb', 'aaaaaaaaaaaaaaaaaaaa'],
    );
    assert.equal(mergeExactIdCatalogDesign(merged, extra).length, 2);
    assert.deepEqual(mergeExactIdCatalogDesign(existing, null), existing);
  });
});
