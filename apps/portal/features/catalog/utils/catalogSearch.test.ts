import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CATALOG_SUMMER_SEARCH_PARITY_FIXTURES } from '@fresh-prints/shared/utils/catalogDesignTextSearch';

import {
  filterCatalogDesignsByCategory,
  filterCatalogDesignsBySearch,
  resolveManagedSearchClientFilters,
} from './catalogSearch';
import { filterCatalogDesignsByHalftone } from './catalogSearch';
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
    favoriteCount: 0,
    ...overrides,
  };
}

describe('resolveManagedSearchClientFilters', () => {
  it('clears local text/category/Halftone filters when Algolia owns the query', () => {
    assert.deepEqual(
      resolveManagedSearchClientFilters({
        isManagedSearchQuery: true,
        searchQuery: 'Scottish cow',
        categoryId: 'cat-1',
        halftoneFilterOn: true,
      }),
      { search: '', categoryId: undefined, halftoneFilterOn: false },
    );
  });

  it('preserves browse post-filters when not on managed search', () => {
    assert.deepEqual(
      resolveManagedSearchClientFilters({
        isManagedSearchQuery: false,
        searchQuery: 'summer',
        categoryId: 'cat-1',
        halftoneFilterOn: true,
      }),
      { search: 'summer', categoryId: 'cat-1', halftoneFilterOn: true },
    );
  });

  it('does not drop Smart Profile hits that fail title-only search', () => {
    const highland = createDesign({
      id: 'yJm2VBRvecPNjx79aSnK',
      title: 'Highland Cow With Bow',
      tags: [],
    });
    const query = 'Scottish cow';
    assert.equal(
      filterCatalogDesignsBySearch([highland], query).length,
      0,
      'legacy title filter alone would hide Algolia Smart Profile matches',
    );
    const client = resolveManagedSearchClientFilters({
      isManagedSearchQuery: true,
      searchQuery: query,
      halftoneFilterOn: false,
    });
    assert.deepEqual(filterCatalogDesignsBySearch([highland], client.search), [highland]);
  });
});

describe('filterCatalogDesignsBySearch', () => {
  it('returns all designs when search is empty', () => {
    const designs = [createDesign(), createDesign({ id: 'design-2', title: 'Mountain' })];

    assert.deepEqual(filterCatalogDesignsBySearch(designs, '   '), designs);
  });

  it('matches title, description, and design id but not legacy tags', () => {
    const designs = [
      createDesign(),
      createDesign({ id: 'design-2', title: 'Forest', description: 'Pine trees', tags: ['nature'] }),
      createDesign({ id: 'yJm2VBRvecPNjx79aSnK', title: 'Highland Cow', tags: [] }),
    ];

    assert.deepEqual(filterCatalogDesignsBySearch(designs, 'ocean').map((design) => design.id), []);
    assert.deepEqual(filterCatalogDesignsBySearch(designs, 'pine').map((design) => design.id), [
      'design-2',
    ]);
    assert.deepEqual(filterCatalogDesignsBySearch(designs, 'nature').map((design) => design.id), []);
    assert.deepEqual(
      filterCatalogDesignsBySearch(designs, 'yJm2VBRvecPNjx79aSnK').map((design) => design.id),
      ['yJm2VBRvecPNjx79aSnK'],
    );
    assert.deepEqual(
      filterCatalogDesignsBySearch(designs, 'vecPNjx').map((design) => design.id),
      ['yJm2VBRvecPNjx79aSnK'],
    );
  });

  it('matches summer progressive substring parity with Studio Design Library', () => {
    for (const fixture of CATALOG_SUMMER_SEARCH_PARITY_FIXTURES) {
      const designs = [createDesign({ id: fixture.title, title: fixture.title })];
      const result = filterCatalogDesignsBySearch(designs, fixture.query);
      assert.equal(
        result.length > 0,
        fixture.expect,
        `title=${fixture.title} query=${fixture.query}`,
      );
    }
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

describe('Halftone filter', () => {
  it('uses the staff classification and ignores legacy tags', () => {
    const designs = [
      createDesign({ id: 'staff', isHalftone: true }),
      createDesign({ id: 'tag-only', tags: ['halftone'], isHalftone: false }),
    ];
    assert.deepEqual(filterCatalogDesignsByHalftone(designs, true).map((design) => design.id), ['staff']);
  });
});
