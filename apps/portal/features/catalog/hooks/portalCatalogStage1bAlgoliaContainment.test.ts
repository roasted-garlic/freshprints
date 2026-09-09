import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const catalogRoot = join(process.cwd(), 'apps/portal/features/catalog');

describe('Stage 1b Algolia portal catalog wiring', () => {
  it('does not expose the retired tag facet key contract', () => {
    const source = readFileSync(
      join(process.cwd(), 'packages/shared/src/catalog-search/portalCatalogAlgoliaRecord.ts'),
      'utf8',
    );
    assert.doesNotMatch(source, /encodePortalCatalogTagFacetKey|tagFacetKeys/);
  });

  it('useCatalogDesigns prefers Algolia when configured and does not call generated on that path', () => {
    const source = readFileSync(join(catalogRoot, 'hooks/useCatalogDesigns.ts'), 'utf8');
    assert.match(source, /isPortalAlgoliaCatalogConfigured/);
    assert.match(source, /portalAlgoliaCatalogSearchService\.listMatchingDesigns/);
    assert.match(source, /useAlgoliaSearch/);
  });

  it('catalogService keeps Firestore browse free of retired tag facets', () => {
    const source = readFileSync(join(catalogRoot, 'services/catalogService.ts'), 'utf8');
    assert.doesNotMatch(source, /portalCatalogAssetService/);
    assert.doesNotMatch(source, /listApprovedTags|listNarrowedApprovedTags|tagFacetKeys|tagIds/);
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
    assert.doesNotMatch(source, /tagIds|tagFacetKeys/);
    assert.match(source, /hitCount/);
  });

  it('useCatalogDesigns advances managed search by hit offset and skips client re-filter', () => {
    const source = readFileSync(join(catalogRoot, 'hooks/useCatalogDesigns.ts'), 'utf8');
    assert.match(source, /managedSearchNextOffset/);
    assert.match(source, /hitCount/);
    assert.match(source, /resolveManagedSearchClientFilters/);
    assert.match(source, /already applied q\/category/);
  });

  it('useCatalogDesigns merges exact design-id lookup alongside Algolia search', () => {
    const source = readFileSync(join(catalogRoot, 'hooks/useCatalogDesigns.ts'), 'utf8');
    assert.match(source, /fetchVisibleExactIdCatalogDesign/);
    assert.match(source, /mergeExactIdCatalogDesign/);
    assert.match(source, /looksLikeDesignDocumentId/);
  });

  it('catalog.css hides Filters trigger on desktop with specificity over portal-button-sm', () => {
    const css = readFileSync(join(process.cwd(), 'apps/portal/styles/catalog.css'), 'utf8');
    assert.match(css, /\.design-library-open-filters-button\.portal-button-sm\s*\{[^}]*display:\s*none/s);
    assert.match(
      css,
      /@media \(max-width: 47\.99rem\)[\s\S]*?\.design-library-open-filters-button\.portal-button-sm\s*\{[^}]*display:\s*inline-flex/s,
    );
  });

  it('CatalogPageContent uses Algolia-narrowed category options', () => {
    const source = readFileSync(join(catalogRoot, 'pages/CatalogPageContent.tsx'), 'utf8');
    assert.match(source, /useNarrowedCatalogCategoryOptions/);
    assert.match(source, /listNarrowedCategoryFacets|useNarrowedCatalogCategoryOptions/);
    const service = readFileSync(
      join(catalogRoot, 'services/portalAlgoliaCatalogSearchService.ts'),
      'utf8',
    );
    assert.match(service, /buildPortalAlgoliaCategoryFacetSearchParams/);
    assert.match(service, /listNarrowedCategoryFacets/);
    assert.match(service, /Intentionally omit categoryId filter/);
  });

  it('Stage 4: generated asset service is retired stub (no Storage fetch API surface for callers)', () => {
    const source = readFileSync(join(catalogRoot, 'services/portalCatalogAssetService.ts'), 'utf8');
    assert.match(source, /Stage 4/);
    assert.match(source, /throw new Error/);
    assert.doesNotMatch(source, /generated\/portal-catalog/);
  });
});
