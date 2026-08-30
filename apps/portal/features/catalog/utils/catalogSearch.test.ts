import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CATALOG_SUMMER_SEARCH_PARITY_FIXTURES } from '@fresh-prints/shared/utils/catalogDesignTextSearch';

import {
  buildApprovedCatalogTagOptions,
  buildCatalogTagOptions,
  countVisibleSelectedTags,
  filterCatalogDesignsByCategory,
  filterCatalogDesignsBySearch,
  filterCatalogDesignsByTags,
  getPrimaryCatalogQueryTag,
  resolveManagedSearchClientFilters,
  selectedTagsIncludeHalftone,
  setHalftoneInSelectedTags,
  visibleSelectedTags,
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
    favoriteCount: 0,
    ...overrides,
  };
}

describe('resolveManagedSearchClientFilters', () => {
  it('clears search/category/tags when Algolia managed search already applied q', () => {
    assert.deepEqual(
      resolveManagedSearchClientFilters({
        isManagedSearchQuery: true,
        searchQuery: 'Scottish cow',
        categoryId: 'cat-1',
        selectedTags: ['ocean'],
      }),
      { search: '', categoryId: undefined, selectedTags: [] },
    );
  });

  it('preserves browse post-filters when not on managed search', () => {
    assert.deepEqual(
      resolveManagedSearchClientFilters({
        isManagedSearchQuery: false,
        searchQuery: 'summer',
        categoryId: 'cat-1',
        selectedTags: ['ocean'],
      }),
      { search: 'summer', categoryId: 'cat-1', selectedTags: ['ocean'] },
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
      selectedTags: [],
    });
    assert.deepEqual(filterCatalogDesignsBySearch([highland], client.search), [highland]);
  });
});

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

  it('filters by canonical halftone tag', () => {
    const designs = [
      createDesign({ tags: ['ocean', 'halftone'] }),
      createDesign({ id: 'design-2', tags: ['ocean'] }),
    ];

    assert.deepEqual(
      filterCatalogDesignsByTags(designs, ['halftone']).map((design) => design.id),
      ['design-1'],
    );
  });
});

describe('halftone filter helpers', () => {
  it('adds and removes the canonical halftone tag', () => {
    assert.deepEqual(setHalftoneInSelectedTags(['ocean'], true), ['halftone', 'ocean']);
    assert.deepEqual(setHalftoneInSelectedTags(['ocean', 'halftone'], false), ['ocean']);
    assert.equal(selectedTagsIncludeHalftone(['Halftone']), true);
  });

  it('exposes visible tags without halftone', () => {
    assert.deepEqual(visibleSelectedTags(['ocean', 'halftone']), ['ocean']);
    assert.equal(countVisibleSelectedTags(['ocean', 'halftone']), 1);
  });

  it('hides halftone from tag filter options', () => {
    const designs = [
      createDesign({ tags: ['ocean', 'halftone'] }),
      createDesign({ id: 'design-2', tags: ['sunset', 'halftone'] }),
    ];

    const options = buildCatalogTagOptions(designs, [], '');
    assert.deepEqual(
      options.map((option) => option.tag),
      ['ocean', 'sunset'],
    );
  });

  it('picks primary server query tag preferring halftone', () => {
    assert.equal(getPrimaryCatalogQueryTag(['ocean', 'halftone']), 'halftone');
    assert.equal(getPrimaryCatalogQueryTag(['ocean', 'zebra']), 'ocean');
    assert.equal(getPrimaryCatalogQueryTag([]), undefined);
  });

  it('lists approved tags without design counts when none are supplied', () => {
    assert.deepEqual(
      buildApprovedCatalogTagOptions(
        [{ name: 'sunset' }, { name: 'ocean' }, { name: 'halftone' }],
        ['ocean'],
        'o',
      ),
      [{ tag: 'ocean', count: undefined, isSelected: true }],
    );
  });

  it('carries each tag design count through to the modal option list', () => {
    assert.deepEqual(
      buildApprovedCatalogTagOptions(
        [
          { name: 'sunset', count: 12 },
          { name: 'ocean', count: 3 },
          { name: 'halftone', count: 99 },
        ],
        [],
        '',
      ),
      [
        { tag: 'ocean', count: 3, isSelected: false },
        { tag: 'sunset', count: 12, isSelected: false },
      ],
    );
  });
});
