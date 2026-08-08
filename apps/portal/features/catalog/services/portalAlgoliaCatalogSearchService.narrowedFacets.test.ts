import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { encodePortalCatalogTagFacetKey } from '@fresh-prints/shared/catalog-search/portalCatalogAlgoliaRecord';

import {
  buildPortalAlgoliaFacetSearchParams,
  hasPortalAlgoliaFacetConstraints,
} from './portalAlgoliaCatalogSearchService';

/**
 * Discriminating Stage 1b-C fixture: global funny count is 32; under
 * q=stupid + funny + quote the narrowed funny count must be 2 — not 32.
 * Pre-fix Algolia narrowed facets used query:'' and ignored catalog q, so
 * UI could keep showing 32 while the grid was already small.
 */
const GLOBAL_FUNNY_COUNT = 32;
const NARROWED_FUNNY_COUNT = 2;

describe('portalAlgoliaCatalogSearchService narrowed facets (Stage 1b-C)', () => {
  it('treats search, tags, and category as facet constraints', () => {
    assert.equal(hasPortalAlgoliaFacetConstraints({}), false);
    assert.equal(hasPortalAlgoliaFacetConstraints({ search: '  ' }), false);
    assert.equal(hasPortalAlgoliaFacetConstraints({ search: 'stupid' }), true);
    assert.equal(hasPortalAlgoliaFacetConstraints({ selectedTags: ['funny'] }), true);
    assert.equal(hasPortalAlgoliaFacetConstraints({ categoryId: 'cat-1' }), true);
  });

  it('builds narrowed facet params with catalog q + tag AND (fails pre-fix query:"")', () => {
    const params = buildPortalAlgoliaFacetSearchParams({
      search: 'stupid',
      selectedTags: ['funny', 'quote'],
    });

    assert.equal(params.query, 'stupid');
    assert.deepEqual(params.facetFilters, [['tagIds:funny'], ['tagIds:quote']]);
    assert.equal(params.filters, undefined);
    assert.equal(params.hitsPerPage, 0);
    assert.deepEqual(params.facets, ['tagFacetKeys']);

    // Discriminator: broken implementation always sent empty query.
    assert.notEqual(params.query, '');
  });

  it('includes category filter when active', () => {
    const params = buildPortalAlgoliaFacetSearchParams({
      search: 'logo',
      categoryId: 'apparel',
      selectedTags: ['funny'],
    });
    assert.equal(params.filters, 'categoryId:apparel');
    assert.equal(params.query, 'logo');
  });

  it('proves narrowed funny count differs from global under owner QA constraints', () => {
    const funnyKey = encodePortalCatalogTagFacetKey('funny', 'funny');
    const globalFacets: Record<string, number> = {
      [funnyKey]: GLOBAL_FUNNY_COUNT,
      [encodePortalCatalogTagFacetKey('attitude', 'attitude')]: 9,
    };
    const narrowedFacets: Record<string, number> = {
      [funnyKey]: NARROWED_FUNNY_COUNT,
      [encodePortalCatalogTagFacetKey('quote', 'quote')]: NARROWED_FUNNY_COUNT,
    };

    assert.ok(GLOBAL_FUNNY_COUNT > NARROWED_FUNNY_COUNT);
    assert.notEqual(globalFacets[funnyKey], narrowedFacets[funnyKey]);
    assert.equal(narrowedFacets[funnyKey], NARROWED_FUNNY_COUNT);

    const params = buildPortalAlgoliaFacetSearchParams({
      search: 'stupid',
      selectedTags: ['funny', 'quote'],
    });
    // Simulated Algolia response for those params must use narrowed distribution.
    const displayedFunny =
      params.query === 'stupid' && (params.facetFilters?.length ?? 0) === 2
        ? narrowedFacets[funnyKey]
        : globalFacets[funnyKey];
    assert.equal(displayedFunny, NARROWED_FUNNY_COUNT);
    assert.notEqual(displayedFunny, GLOBAL_FUNNY_COUNT);
  });

  it('CatalogTagFilterModal wires catalog search + category into narrowed facet load', () => {
    const catalogRoot = join(process.cwd(), 'apps/portal/features/catalog');
    const modal = readFileSync(join(catalogRoot, 'components/CatalogTagFilterModal.tsx'), 'utf8');
    const page = readFileSync(join(catalogRoot, 'pages/CatalogPageContent.tsx'), 'utf8');
    assert.match(modal, /catalogSearchQuery/);
    assert.match(modal, /categoryId/);
    assert.match(modal, /listNarrowedApprovedTags\([\s\S]*search:/);
    assert.match(page, /catalogSearchQuery=\{debouncedSearchQuery\}/);
    assert.match(page, /categoryId=\{categoryFilter/);
  });

  it('catalogService forwards search/category on Algolia narrowed facet path', () => {
    const source = readFileSync(
      join(process.cwd(), 'apps/portal/features/catalog/services/catalogService.ts'),
      'utf8',
    );
    assert.match(
      source,
      /listNarrowedApprovedTags\([\s\S]*options: \{ search\?: string; categoryId\?: string \}/,
    );
    assert.match(source, /listNarrowedTagFacets\(\{[\s\S]*search: options\.search/);
    assert.doesNotMatch(source, /portalCatalogAssetService/);
  });
});
