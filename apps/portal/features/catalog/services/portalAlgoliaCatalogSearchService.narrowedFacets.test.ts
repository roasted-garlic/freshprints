import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  buildPortalAlgoliaCategoryFacetSearchParams,
  buildPortalAlgoliaSmartFacetSearchParams,
  hasPortalAlgoliaFacetConstraints,
} from './portalAlgoliaCatalogSearchService';

describe('Portal Algolia narrowed Smart Profile facets', () => {
  it('treats search, Smart Profile selections, and category as facet constraints', () => {
    assert.equal(hasPortalAlgoliaFacetConstraints({}), false);
    assert.equal(hasPortalAlgoliaFacetConstraints({ search: '  ' }), false);
    assert.equal(hasPortalAlgoliaFacetConstraints({ search: 'stupid' }), true);
    assert.equal(hasPortalAlgoliaFacetConstraints({ smartFilters: { subjects: ['cow'] } }), true);
    assert.equal(hasPortalAlgoliaFacetConstraints({ categoryId: 'cat-1' }), true);
  });

  it('builds narrowed Smart facet params with the catalog query', () => {
    const params = buildPortalAlgoliaSmartFacetSearchParams({
      search: 'stupid',
      smartFilters: { subjects: ['cow'], styles: ['cartoon'] },
    });

    assert.equal(params.query, 'stupid');
    assert.deepEqual(params.facetFilters, [['subjects:cow'], ['styles:cartoon']]);
    assert.equal(params.filters, undefined);
    assert.equal(params.hitsPerPage, 0);
    assert.deepEqual(params.facets, ['subjects', 'styles', 'themes', 'interests', 'professionsGroups', 'occasions', 'places', 'colors']);
    assert.notEqual(params.query, '');
  });

  it('includes category filter for Smart facet distributions', () => {
    const params = buildPortalAlgoliaSmartFacetSearchParams({
      search: 'logo',
      categoryId: 'apparel',
      smartFilters: { subjects: ['cow'] },
    });
    assert.equal(params.filters, 'categoryId:apparel');
    assert.equal(params.query, 'logo');
  });

  it('keeps category facet disjunctive while applying Smart selections', () => {
    const params = buildPortalAlgoliaCategoryFacetSearchParams({
      search: 'nurse',
      categoryId: 'occupations',
      smartFilters: { professionsGroups: ['nurses'] },
    });
    assert.equal(params.query, 'nurse');
    assert.equal(params.filters, undefined);
    assert.deepEqual(params.facetFilters, [['professionsGroups:nurses']]);
    assert.deepEqual(params.facets, ['categoryId']);
  });

  it('removed the Portal tag modal and direct tag-facet source path', () => {
    const catalogRoot = join(process.cwd(), 'apps/portal/features/catalog');
    const modal = readFileSync(join(catalogRoot, 'components/CatalogTagFilterModal.tsx'), 'utf8');
    const page = readFileSync(join(catalogRoot, 'pages/CatalogPageContent.tsx'), 'utf8');
    const service = readFileSync(join(catalogRoot, 'services/catalogService.ts'), 'utf8');
    assert.match(modal, /Retired compatibility export/);
    assert.doesNotMatch(page, /CatalogTagFilterModal|selectedTags|listNarrowedApprovedTags/);
    assert.doesNotMatch(service, /listApprovedTags|listNarrowedApprovedTags|tagFacetKeys|tagIds/);
  });
});
