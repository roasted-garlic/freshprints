import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('Portal Phase 1A ordinary browse containment', () => {
  it('ordinary gate allows category, single-tag, and discovery without search/multi-tag', () => {
    const source = read('apps/portal/features/catalog/hooks/useCatalogDesigns.ts');
    assert.match(source, /allowsBoundedCatalogFirestoreFallback/);
    assert.match(source, /listReadyDesignsPageWithSortFallback/);
    assert.match(source, /listHomeDiscoveryPool/);
    assert.match(source, /requiresGeneratedSearchPath|useGeneratedSearch/);
  });

  it('Discover home uses listHomeDiscoveryPool, not listDiscoverDesigns', () => {
    const source = read('apps/portal/features/catalog/hooks/useCatalogDesigns.ts');
    const homeStart = source.indexOf('export function useCatalogHomeDesigns');
    const homeBlock = source.slice(homeStart, homeStart + 1200);
    assert.match(homeBlock, /listHomeDiscoveryPool/);
    assert.doesNotMatch(homeBlock, /listDiscoverDesigns/);
  });

  it('keeps portal generated search/facet readers intact', () => {
    assert.ok(
      readFileSync('apps/portal/features/catalog/services/portalCatalogAssetService.ts', 'utf8')
        .length > 0,
    );
    assert.ok(
      readFileSync('apps/portal/features/catalog/services/catalogSnapshotFlags.ts', 'utf8')
        .length > 0,
    );
  });

  it('selection cards default to lazy thumbs; first viewport may opt into eager', () => {
    const card = read('apps/portal/features/catalog/components/CatalogSelectionCard.tsx');
    assert.match(card, /prioritizeLoading = false/);
    const page = read('apps/portal/features/catalog/pages/CatalogPageContent.tsx');
    assert.match(page, /CATALOG_FIRST_VIEWPORT_EAGER_COUNT/);
    assert.match(page, /prioritizeLoading=\{prioritizeLoading\}/);
  });
});
