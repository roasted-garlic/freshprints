import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { orderReadyDesignsByRequestedIds, mapPortalActiveCategory, sortPortalCatalogCategories } from './catalogService';
import type { CatalogDesign, CatalogCategory } from '../types/catalog.types';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

function stubDesign(id: string): CatalogDesign {
  return {
    id,
    title: id,
    tags: [],
    status: 'ready',
    thumbnailPath: `thumbs/${id}.webp`,
  } as CatalogDesign;
}

/**
 * b397ec0 Stage 1a mapper weakness: accepted any named category doc without requiring
 * `isActive === true`. Kept here so the Amendment 1 regression proves the fix.
 */
function mapCategoryDocumentWeakB397ec0(
  categoryId: string,
  data: Record<string, unknown>,
): CatalogCategory | null {
  if (typeof data.name !== 'string') return null;
  return {
    id: categoryId,
    name: data.name,
    ...(typeof data.description === 'string' ? { description: data.description } : {}),
    sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : 0,
  };
}

describe('orderReadyDesignsByRequestedIds', () => {
  it('preserves requested order when Firestore-like results arrive out of order', () => {
    const found = [stubDesign('design-c'), stubDesign('design-a'), stubDesign('design-b')];
    const ordered = orderReadyDesignsByRequestedIds(
      ['design-a', 'design-b', 'design-c'],
      found,
    );
    assert.deepEqual(
      ordered.map((design) => design.id),
      ['design-a', 'design-b', 'design-c'],
    );
  });

  it('omits missing IDs without inventing placeholders', () => {
    const ordered = orderReadyDesignsByRequestedIds(
      ['design-a', 'design-missing', 'design-b'],
      [stubDesign('design-b'), stubDesign('design-a')],
    );
    assert.deepEqual(
      ordered.map((design) => design.id),
      ['design-a', 'design-b'],
    );
  });
});

describe('Amendment 1 — mapPortalActiveCategory excludes inactive (fails on b397ec0 weak mapper)', () => {
  it('includes active categories', () => {
    const mapped = mapPortalActiveCategory('cat-active', {
      name: 'Animals',
      isActive: true,
      sortOrder: 2,
    });
    assert.deepEqual(mapped, { id: 'cat-active', name: 'Animals', sortOrder: 2 });
  });

  it('excludes isActive false (archived) — weak b397ec0 mapper would include these', () => {
    const inactive = { name: 'Legacy', isActive: false, sortOrder: 0 };
    assert.equal(mapPortalActiveCategory('cat-inactive', inactive), null);
    assert.ok(
      mapCategoryDocumentWeakB397ec0('cat-inactive', inactive),
      'discriminating control: b397ec0-style mapper still accepts inactive docs',
    );
  });

  it('excludes missing or non-boolean isActive', () => {
    assert.equal(mapPortalActiveCategory('a', { name: 'NoFlag' }), null);
    assert.equal(mapPortalActiveCategory('b', { name: 'StringTrue', isActive: 'true' }), null);
    assert.equal(mapPortalActiveCategory('c', { name: 'One', isActive: 1 }), null);
  });

  it('excludes malformed name', () => {
    assert.equal(mapPortalActiveCategory('d', { name: 12, isActive: true }), null);
  });

  it('preserves sortOrder then name ordering', () => {
    const ordered = sortPortalCatalogCategories([
      { id: 'b', name: 'Beta', sortOrder: 1 },
      { id: 'a', name: 'Alpha', sortOrder: 1 },
      { id: 'c', name: 'First', sortOrder: 0 },
    ]);
    assert.deepEqual(
      ordered.map((category) => category.id),
      ['c', 'a', 'b'],
    );
  });

  it('listActiveCategories uses mapPortalActiveCategory and does not call generated taxonomy', () => {
    const source = read('apps/portal/features/catalog/services/catalogService.ts');
    const start = source.indexOf('async listActiveCategories');
    assert.ok(start >= 0);
    // Stop before the Stage 1b facet JSDoc that still mentions portalCatalogAssetService.
    const facetDoc = source.indexOf('Tags for the Portal tag modal', start);
    assert.ok(facetDoc > start);
    const block = source.slice(start, facetDoc);
    assert.match(block, /mapPortalActiveCategory/);
    assert.match(block, /where\('isActive', '==', true\)/);
    assert.match(block, /selectCustomerVisibleCategories/);
    assert.doesNotMatch(block, /loadClientTaxonomy/);
    assert.doesNotMatch(block, /portalCatalogAssetService/);
  });
});

describe('Phase 1B Stage 1a — Firestore-primary known-ID + categories', () => {
  const catalogServiceSource = read(
    'apps/portal/features/catalog/services/catalogService.ts',
  );

  it('getReadyDesignsByIds does not call generated card loading', () => {
    const start = catalogServiceSource.indexOf('async getReadyDesignsByIds');
    assert.ok(start >= 0);
    const nextMethod = catalogServiceSource.indexOf('\n  async ', start + 1);
    const block = catalogServiceSource.slice(start, nextMethod > start ? nextMethod : undefined);
    assert.doesNotMatch(block, /portalCatalogAssetService/);
    assert.doesNotMatch(block, /getDesignsByIds/);
    assert.doesNotMatch(block, /generatedPortalCatalogEnabled/);
    assert.match(block, /loadCatalogDesignByIdCached/);
    assert.match(block, /getDoc/);
    assert.match(block, /orderReadyDesignsByRequestedIds/);
  });

  it('known-ID hydration uses per-doc getDoc with cache (not batch in / not listAllReadyDesigns)', () => {
    const start = catalogServiceSource.indexOf('async getReadyDesignsByIds');
    const nextMethod = catalogServiceSource.indexOf('\n  async ', start + 1);
    const block = catalogServiceSource.slice(start, nextMethod > start ? nextMethod : undefined);
    assert.doesNotMatch(block, /where\(['"]__name__['"]/);
    assert.doesNotMatch(block, /documentId\(/);
    assert.doesNotMatch(block, /\bin\b.*chunk|chunkValues/);
    assert.doesNotMatch(block, /listAllReadyDesigns/);
    assert.match(block, /permission-denied/);
    assert.match(block, /mapCatalogDesign/);
  });

  it('listActiveCategories is Firestore-only and maps through mapPortalActiveCategory', () => {
    const start = catalogServiceSource.indexOf('async listActiveCategories');
    assert.ok(start >= 0);
    const facetDoc = catalogServiceSource.indexOf('Tags for the Portal tag modal', start);
    assert.ok(facetDoc > start);
    const block = catalogServiceSource.slice(start, facetDoc);
    assert.doesNotMatch(block, /loadClientTaxonomy/);
    assert.doesNotMatch(block, /generatedPortalCatalogEnabled/);
    assert.doesNotMatch(block, /portalCatalogAssetService/);
    assert.match(block, /where\('isActive', '==', true\)/);
    assert.match(block, /mapPortalActiveCategory/);
    assert.match(block, /sortPortalCatalogCategories/);
    assert.match(block, /selectCustomerVisibleCategories/);
    assert.match(block, /countReadyDesigns/);
  });

  it('does not import generatedPortalCatalogEnabled after Stage 1a cutover of by-id and categories', () => {
    assert.doesNotMatch(
      catalogServiceSource,
      /generatedPortalCatalogEnabled/,
    );
  });
});

describe('Phase 1A catalogService page cache + home pool wiring', () => {
  it('exports page-cache invalidation and wraps sort-fallback + home pool with bounded cache', () => {
    const source = read('apps/portal/features/catalog/services/catalogService.ts');
    assert.match(source, /createBoundedAsyncCache/);
    assert.match(source, /invalidateCatalogPageCaches/);
    assert.match(source, /catalogPageCache\.get/);
    assert.match(source, /homeDiscoveryPoolCache\.get/);
    assert.match(source, /CATALOG_PAGE_CACHE_TTL_MS/);
  });
});
