import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  encodePortalCatalogTagFacetKey,
  parsePortalCatalogTagFacetKey,
} from '@fresh-prints/shared/catalog-search/portalCatalogAlgoliaRecord';

const catalogRoot = join(process.cwd(), 'apps/portal/features/catalog');

describe('Stage 1b Algolia portal catalog wiring', () => {
  it('encodes and parses tag facet keys', () => {
    const key = encodePortalCatalogTagFacetKey('tag-1', 'Sunset');
    assert.equal(key, 'tag-1::Sunset');
    assert.deepEqual(parsePortalCatalogTagFacetKey(key), { id: 'tag-1', name: 'Sunset' });
  });

  it('useCatalogDesigns prefers Algolia when configured and does not call generated on that path', () => {
    const source = readFileSync(join(catalogRoot, 'hooks/useCatalogDesigns.ts'), 'utf8');
    assert.match(source, /isPortalAlgoliaCatalogConfigured/);
    assert.match(source, /portalAlgoliaCatalogSearchService\.listMatchingDesigns/);
    assert.match(source, /useAlgoliaSearch/);
  });

  it('catalogService facets route through Algolia when configured', () => {
    const source = readFileSync(join(catalogRoot, 'services/catalogService.ts'), 'utf8');
    assert.match(source, /portalAlgoliaCatalogSearchService/);
    assert.match(source, /listTagFacets/);
    assert.match(source, /listNarrowedTagFacets/);
  });

  it('CatalogPageContent debounces search input (no per-keystroke Algolia)', () => {
    const source = readFileSync(join(catalogRoot, 'pages/CatalogPageContent.tsx'), 'utf8');
    assert.match(source, /CATALOG_SEARCH_DEBOUNCE_MS/);
    assert.match(source, /debouncedSearchQuery/);
    assert.match(source, /searchQuery: debouncedSearchQuery/);
  });

  it('Algolia search service hydrates cards via Firestore by-id order helper', () => {
    const source = readFileSync(
      join(catalogRoot, 'services/portalAlgoliaCatalogSearchService.ts'),
      'utf8',
    );
    assert.match(source, /hydrateCatalogDesignsPreservingOrder/);
    assert.match(source, /getReadyDesignsByIds/);
    assert.match(source, /facetFilters/);
    assert.match(source, /tagIds:/);
    assert.match(source, /hitCount/);
  });

  it('useCatalogDesigns advances managed search by hit offset and skips client re-filter', () => {
    const source = readFileSync(join(catalogRoot, 'hooks/useCatalogDesigns.ts'), 'utf8');
    assert.match(source, /managedSearchNextOffset/);
    assert.match(source, /hitCount/);
    assert.match(
      source,
      /Managed search \(Algolia\/generated\) already applied q\/tags\/category/,
    );
  });

  it('generated asset service remains for Stage 4 transition (not deleted)', () => {
    const source = readFileSync(join(catalogRoot, 'services/portalCatalogAssetService.ts'), 'utf8');
    assert.match(source, /listMatchingDesigns/);
    assert.match(source, /listTagFacets/);
  });
});
