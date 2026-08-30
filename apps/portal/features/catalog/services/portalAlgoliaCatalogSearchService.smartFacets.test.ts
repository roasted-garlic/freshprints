import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildNarrowedCatalogCategoryOptions,
  buildPortalAlgoliaCategoryFacetSearchParams,
  buildPortalAlgoliaCombinedFacetFilters,
  buildPortalAlgoliaSmartFacetSearchParams,
  buildSmartFacetAndFilters,
  countSelectedSmartFilters,
  hasPortalAlgoliaCategoryFacetConstraints,
  hasPortalAlgoliaFacetConstraints,
  hasSelectedSmartFilters,
  mergePortalAlgoliaCategoryFacetDistribution,
  mergePortalAlgoliaSmartFacetDistribution,
  SMART_FACET_ATTRIBUTES,
} from './portalAlgoliaCatalogSearchService';

describe('buildSmartFacetAndFilters', () => {
  it('builds one AND group per selected value', () => {
    assert.deepEqual(
      buildSmartFacetAndFilters({
        subjects: ['cow', 'dog'],
        styles: ['cartoon'],
      }),
      [['subjects:cow'], ['subjects:dog'], ['styles:cartoon']],
    );
  });

  it('trims, dedupes, and skips empty values', () => {
    assert.deepEqual(
      buildSmartFacetAndFilters({
        colors: ['  red  ', 'red', '', '  '],
        themes: undefined,
      }),
      [['colors:red']],
    );
  });

  it('never emits objects, searchConcepts, or visibleText keys', () => {
    const smuggled = {
      subjects: ['cow'],
      objects: ['hat'],
      searchConcepts: ['scottish cow'],
      visibleText: ['HELLO'],
    };
    const filters = buildSmartFacetAndFilters(smuggled as typeof smuggled & { subjects: string[] });
    const serialized = JSON.stringify(filters);
    assert.match(serialized, /subjects:cow/);
    assert.doesNotMatch(serialized, /objects:/);
    assert.doesNotMatch(serialized, /searchConcepts:/);
    assert.doesNotMatch(serialized, /visibleText:/);
  });

  it('returns empty for missing or empty smart filters', () => {
    assert.deepEqual(buildSmartFacetAndFilters(undefined), []);
    assert.deepEqual(buildSmartFacetAndFilters({}), []);
    assert.deepEqual(buildSmartFacetAndFilters({ subjects: [] }), []);
  });
});

describe('buildPortalAlgoliaCombinedFacetFilters', () => {
  it('combines tag AND with smart facet AND', () => {
    assert.deepEqual(
      buildPortalAlgoliaCombinedFacetFilters({
        selectedTags: ['funny', 'quote'],
        smartFilters: { subjects: ['cow'] },
      }),
      [['tagIds:funny'], ['tagIds:quote'], ['subjects:cow']],
    );
  });
});

describe('smart facet search params', () => {
  it('requests only the 8 customer facet attributes', () => {
    const params = buildPortalAlgoliaSmartFacetSearchParams({
      search: 'highland',
      selectedTags: ['funny'],
      categoryId: 'animals',
      smartFilters: { colors: ['brown'] },
    });
    assert.equal(params.query, 'highland');
    assert.equal(params.filters, 'categoryId:animals');
    assert.deepEqual(params.facetFilters, [['tagIds:funny'], ['colors:brown']]);
    assert.deepEqual(params.facets, [...SMART_FACET_ATTRIBUTES]);
    assert.doesNotMatch(params.facets.join(','), /objects|searchConcepts|visibleText/);
  });

  it('treats smart filters as facet constraints', () => {
    assert.equal(hasPortalAlgoliaFacetConstraints({}), false);
    assert.equal(hasSelectedSmartFilters({ subjects: ['cow'] }), true);
    assert.equal(countSelectedSmartFilters({ subjects: ['cow'], colors: ['red', 'blue'] }), 3);
    assert.equal(
      hasPortalAlgoliaFacetConstraints({ smartFilters: { subjects: ['cow'] } }),
      true,
    );
  });
});

describe('mergePortalAlgoliaSmartFacetDistribution', () => {
  it('drops non-positive counts and sorts by value', () => {
    assert.deepEqual(
      mergePortalAlgoliaSmartFacetDistribution({
        zebra: 1,
        cow: 4,
        empty: 0,
      }),
      [
        { value: 'cow', count: 4 },
        { value: 'zebra', count: 1 },
      ],
    );
  });
});

describe('category facet narrowing (Slice 3 refinement)', () => {
  it('omits selected category from facet constraints and only requests categoryId', () => {
    const params = buildPortalAlgoliaCategoryFacetSearchParams({
      search: 'nurse',
      selectedTags: ['funny'],
      categoryId: 'occupations',
      smartFilters: { professionsGroups: ['nurses'] },
    });
    assert.equal(params.query, 'nurse');
    assert.equal(params.filters, undefined);
    assert.deepEqual(params.facets, ['categoryId']);
    assert.deepEqual(params.facetFilters, [['tagIds:funny'], ['professionsGroups:nurses']]);
  });

  it('narrows when search or smart filters are active, not for empty constraints', () => {
    assert.equal(hasPortalAlgoliaCategoryFacetConstraints({ search: 'nurse' }), true);
    assert.equal(
      hasPortalAlgoliaCategoryFacetConstraints({ smartFilters: { subjects: ['cow'] } }),
      true,
    );
    assert.equal(hasPortalAlgoliaCategoryFacetConstraints({ selectedTags: ['funny'] }), true);
    assert.equal(hasPortalAlgoliaCategoryFacetConstraints({}), false);
  });

  it('builds options from facet ids and keeps selected category visible', () => {
    assert.deepEqual(
      mergePortalAlgoliaCategoryFacetDistribution({
        occupations: 3,
        funny: 2,
        empty: 0,
      }).map((entry) => entry.id),
      ['funny', 'occupations'],
    );

    assert.deepEqual(
      buildNarrowedCatalogCategoryOptions({
        categories: [
          { id: 'occupations', name: 'Occupations' },
          { id: 'funny', name: 'Funny & Sarcastic' },
          { id: 'animals', name: 'Animals' },
        ],
        facetCategoryIds: ['occupations', 'funny'],
        selectedCategoryId: 'occupations',
      }),
      [
        { value: '', label: 'All categories' },
        { value: 'occupations', label: 'Occupations' },
        { value: 'funny', label: 'Funny & Sarcastic' },
      ],
    );

    assert.deepEqual(
      buildNarrowedCatalogCategoryOptions({
        categories: [
          { id: 'occupations', name: 'Occupations' },
          { id: 'funny', name: 'Funny & Sarcastic' },
        ],
        facetCategoryIds: ['funny'],
        selectedCategoryId: 'occupations',
      }).map((option) => option.value),
      ['', 'occupations', 'funny'],
    );
  });
});
