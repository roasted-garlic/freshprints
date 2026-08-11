import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  PORTAL_CATALOG_ALGOLIA_EXACT_TOKEN_SEARCH_PARAMS,
  withPortalCatalogAlgoliaExactTokenSearchParams,
} from './portalCatalogAlgoliaExactSearchParams.ts';

describe('portalCatalogAlgoliaExactSearchParams', () => {
  it('defines typoTolerance false and queryType prefixLast', () => {
    assert.equal(PORTAL_CATALOG_ALGOLIA_EXACT_TOKEN_SEARCH_PARAMS.typoTolerance, false);
    assert.equal(PORTAL_CATALOG_ALGOLIA_EXACT_TOKEN_SEARCH_PARAMS.queryType, 'prefixLast');
  });

  it('merges params for non-empty queries', () => {
    const params = withPortalCatalogAlgoliaExactTokenSearchParams(
      { query: 'kil', hitsPerPage: 24 },
      'kil',
    );
    assert.equal(params.typoTolerance, false);
    assert.equal(params.queryType, 'prefixLast');
  });

  it('skips exact-token params for empty / blank queries', () => {
    const empty = withPortalCatalogAlgoliaExactTokenSearchParams({ query: '', hitsPerPage: 0 }, '');
    assert.equal('typoTolerance' in empty, false);

    const blank = withPortalCatalogAlgoliaExactTokenSearchParams({ query: '  ' }, '   ');
    assert.equal('queryType' in blank, false);
  });

  it('Kill exactness: typoTolerance off; prefixLast (not prefixAll) for typeahead without Willie fuzzy', () => {
    const forKill = withPortalCatalogAlgoliaExactTokenSearchParams({ query: 'Kill' }, 'Kill');
    assert.equal(forKill.typoTolerance, false, 'typoTolerance false blocks Kill→Will');
    assert.equal(forKill.queryType, 'prefixLast', 'prefixLast allows kil→Kill; not fuzzy Will');
  });
});
