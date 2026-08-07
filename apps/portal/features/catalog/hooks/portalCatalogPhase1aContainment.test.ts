import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('Portal Phase 1A / 1B Stage 1a ordinary browse containment', () => {
  it('ordinary gate allows category, single-tag, and discovery without search/multi-tag', () => {
    const source = read('apps/portal/features/catalog/hooks/useCatalogDesigns.ts');
    assert.match(source, /allowsBoundedCatalogFirestoreFallback/);
    assert.match(source, /listReadyDesignsPageWithSortFallback/);
    assert.match(source, /listHomeDiscoveryPool/);
    assert.match(source, /requiresGeneratedSearchPath|useGeneratedSearch|requiresManagedSearchPath|useManagedSearch|useAlgoliaSearch/);
  });

  it('Discover home uses listHomeDiscoveryPool; listDiscoverDesigns is removed', () => {
    const source = read('apps/portal/features/catalog/hooks/useCatalogDesigns.ts');
    const homeStart = source.indexOf('export function useCatalogHomeDesigns');
    const homeBlock = source.slice(homeStart, homeStart + 1200);
    assert.match(homeBlock, /listHomeDiscoveryPool/);
    assert.doesNotMatch(homeBlock, /listDiscoverDesigns/);

    const assetService = read(
      'apps/portal/features/catalog/services/portalCatalogAssetService.ts',
    );
    assert.doesNotMatch(assetService, /listDiscoverDesigns/);
    assert.doesNotMatch(assetService, /parsePortalCatalogDiscoverSnapshot/);
  });

  it('keeps portal generated search/facet readers intact for Stage 1b', () => {
    const asset = read('apps/portal/features/catalog/services/portalCatalogAssetService.ts');
    assert.match(asset, /listMatchingDesigns/);
    assert.match(asset, /listTagFacets/);
    assert.match(asset, /listNarrowedTagFacets/);
    assert.ok(
      read('apps/portal/features/catalog/services/catalogSnapshotFlags.ts').length > 0,
    );

    const catalogService = read('apps/portal/features/catalog/services/catalogService.ts');
    assert.match(catalogService, /listApprovedTags[\s\S]*listTagFacets/);
    assert.match(catalogService, /listNarrowedApprovedTags[\s\S]*listNarrowedTagFacets/);
  });

  it('Favorites / share / request / Assisted / account hydrate via catalogService.getReadyDesignsByIds', () => {
    const paths = [
      'apps/portal/features/favorites/pages/FavoritesPageContent.tsx',
      'apps/portal/features/catalog/pages/ShareDesignPortalPageContent.tsx',
      'apps/portal/features/catalog/hooks/useCatalogDesignDeepLink.ts',
      'apps/portal/features/print-requests/hooks/useWorkingCurrentRequestItems.ts',
      'apps/portal/features/print-requests/services/portalPrintRequestService.ts',
      'apps/portal/features/account/services/accountReusableDesignsService.ts',
      'apps/portal/features/assisted-creation/components/AssistedCreationDetailPanels.tsx',
      'apps/portal/features/assisted-creation/components/AssistedCreationStatusPanel.tsx',
    ];
    for (const path of paths) {
      const source = read(path);
      assert.match(
        source,
        /getReadyDesignsByIds/,
        `${path} must call getReadyDesignsByIds`,
      );
      assert.doesNotMatch(
        source,
        /portalCatalogAssetService/,
        `${path} must not call portalCatalogAssetService directly`,
      );
    }
  });

  it('selection cards default to lazy thumbs; first viewport may opt into eager', () => {
    const card = read('apps/portal/features/catalog/components/CatalogSelectionCard.tsx');
    assert.match(card, /prioritizeLoading = false/);
    const page = read('apps/portal/features/catalog/pages/CatalogPageContent.tsx');
    assert.match(page, /CATALOG_FIRST_VIEWPORT_EAGER_COUNT/);
    assert.match(page, /prioritizeLoading=\{prioritizeLoading\}/);
  });
});
