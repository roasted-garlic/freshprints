import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  PORTAL_CATALOG_ALGOLIA_EXACT_TOKEN_SEARCH_PARAMS,
  withPortalCatalogAlgoliaExactTokenSearchParams,
} from './portalCatalogAlgoliaExactSearchParams.ts';

describe('portalCatalogAlgoliaExactSearchParams', () => {
  it('defines typoTolerance false and queryType prefixNone', () => {
    assert.equal(PORTAL_CATALOG_ALGOLIA_EXACT_TOKEN_SEARCH_PARAMS.typoTolerance, false);
    assert.equal(PORTAL_CATALOG_ALGOLIA_EXACT_TOKEN_SEARCH_PARAMS.queryType, 'prefixNone');
  });

  it('applies exact-token params for Kill-style non-empty queries', () => {
    const params = withPortalCatalogAlgoliaExactTokenSearchParams(
      { query: 'Kill', hitsPerPage: 40 },
      'Kill',
    );
    assert.equal(params.typoTolerance, false);
    assert.equal(params.queryType, 'prefixNone');
    assert.equal(params.query, 'Kill');
  });

  it('does not apply exact-token params for empty / whitespace queries', () => {
    const empty = withPortalCatalogAlgoliaExactTokenSearchParams({ query: '', hitsPerPage: 0 }, '');
    assert.equal('typoTolerance' in empty, false);
    assert.equal('queryType' in empty, false);

    const blank = withPortalCatalogAlgoliaExactTokenSearchParams({ query: '  ' }, '   ');
    assert.equal('typoTolerance' in blank, false);
  });

  it('documents Kill must not match Will/Willie via typo+prefix disables', () => {
    // Regression contract for owner reproduction: Kill vs Will (typo) / Willie (prefix).
    const forKill = withPortalCatalogAlgoliaExactTokenSearchParams({ query: 'Kill' }, 'Kill');
    assert.equal(forKill.typoTolerance, false, 'typoTolerance false blocks Kill↔Will');
    assert.equal(forKill.queryType, 'prefixNone', 'prefixNone blocks Kill→Willie prefix');
  });
});
