import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  filterCatalogDesignsByCategory,
  filterCatalogDesignsBySearch,
  filterCatalogDesignsByTags,
} from './catalogSearch';
import type { CatalogDesign } from '../types/catalog.types';

function createDesign(overrides: Partial<CatalogDesign> = {}): CatalogDesign {
  return {
    id: 'design-1',
    title: 'Sunset Wave',
    tags: ['ocean'],
    thumbnailPath: '/thumbnails/design-1.webp',
    width: 3000,
    height: 3000,
    requestCount: 0,
    ...overrides,
  };
}

describe('filterCatalogDesignsBySearch', () => {
  it('returns all designs when search is empty', () => {
    const designs = [createDesign(), createDesign({ id: 'design-2', title: 'Mountain' })];

    assert.deepEqual(filterCatalogDesignsBySearch(designs, '   '), designs);
  });

  it('matches title, description, and tags', () => {
    const designs = [
      createDesign(),
      createDesign({ id: 'design-2', title: 'Forest', description: 'Pine trees', tags: ['nature'] }),
    ];

    assert.deepEqual(filterCatalogDesignsBySearch(designs, 'ocean').map((design) => design.id), [
      'design-1',
    ]);
    assert.deepEqual(filterCatalogDesignsBySearch(designs, 'pine').map((design) => design.id), [
      'design-2',
    ]);
    assert.deepEqual(filterCatalogDesignsBySearch(designs, 'nature').map((design) => design.id), [
      'design-2',
    ]);
  });
});

describe('filterCatalogDesignsByCategory', () => {
  it('filters by category id', () => {
    const designs = [
      createDesign({ categoryId: 'animals' }),
      createDesign({ id: 'design-2', categoryId: 'nature' }),
    ];

    assert.deepEqual(
      filterCatalogDesignsByCategory(designs, 'animals').map((design) => design.id),
      ['design-1'],
    );
  });
});

describe('filterCatalogDesignsByTags', () => {
  it('requires every selected tag', () => {
    const designs = [
      createDesign({ tags: ['ocean', 'sunset'] }),
      createDesign({ id: 'design-2', tags: ['ocean'] }),
    ];

    assert.deepEqual(
      filterCatalogDesignsByTags(designs, ['ocean', 'sunset']).map((design) => design.id),
      ['design-1'],
    );
  });
});
