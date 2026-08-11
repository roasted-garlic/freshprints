import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { buildPortalAlgoliaFacetSearchParams } from './portalAlgoliaCatalogSearchService.ts';

function readService(): string {
  return readFileSync(
    'apps/portal/features/catalog/services/portalAlgoliaCatalogSearchService.ts',
    'utf8',
  );
}

describe('Portal Algolia exact-token search params', () => {
  it('listMatchingDesigns applies exact-token helper (containment)', () => {
    const source = readService();
    assert.match(source, /withPortalCatalogAlgoliaExactTokenSearchParams/);
    assert.doesNotMatch(source, /setSettings/);
    assert.doesNotMatch(source, /ALGOLIA_ADMIN/);
  });

  it('facet builder applies exact params for Kill and not for empty query', () => {
    const withQuery = buildPortalAlgoliaFacetSearchParams({ search: 'Kill' });
    assert.equal(withQuery.typoTolerance, false);
    assert.equal(withQuery.queryType, 'prefixNone');
    assert.equal(withQuery.query, 'Kill');

    const empty = buildPortalAlgoliaFacetSearchParams({ search: '' });
    assert.equal(empty.typoTolerance, undefined);
    assert.equal(empty.queryType, undefined);
  });

  it('Kill exactness contract: typoTolerance off and prefixNone (blocks Will / Willie)', () => {
    const params = buildPortalAlgoliaFacetSearchParams({ search: 'Kill' });
    assert.equal(params.typoTolerance, false, 'Kill must not typo-match Will');
    assert.equal(params.queryType, 'prefixNone', 'Kill must not prefix-match Willie');
  });

  it('list and facet paths share the same exact-token helper', () => {
    const source = readService();
    const listIdx = source.indexOf('async listMatchingDesigns');
    const listBlock = source.slice(listIdx, listIdx + 1600);
    assert.match(listBlock, /withPortalCatalogAlgoliaExactTokenSearchParams/);
    assert.match(source, /buildPortalAlgoliaFacetSearchParams[\s\S]*withPortalCatalogAlgoliaExactTokenSearchParams/);
  });
});
