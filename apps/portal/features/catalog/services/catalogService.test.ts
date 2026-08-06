import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { orderReadyDesignsByRequestedIds } from './catalogService';
import type { CatalogDesign } from '../types/catalog.types';

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

  it('listActiveCategories is Firestore-only (no catalog-reference / loadClientTaxonomy)', () => {
    const start = catalogServiceSource.indexOf('async listActiveCategories');
    assert.ok(start >= 0);
    const marker = "source: 'catalogService.listActiveCategories'";
    assert.match(catalogServiceSource.slice(start, start + 800), new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    const closing = catalogServiceSource.indexOf("where('isActive', '==', true)", start);
    assert.ok(closing > start);
    // Bound the assertion to the method body only (exclude the following JSDoc that
    // still documents Stage 1b facet readers on portalCatalogAssetService).
    const bodyOnly = catalogServiceSource.slice(start, closing + 80);
    assert.doesNotMatch(bodyOnly, /loadClientTaxonomy/);
    assert.doesNotMatch(bodyOnly, /generatedPortalCatalogEnabled/);
    assert.doesNotMatch(bodyOnly, /portalCatalogAssetService/);
    assert.match(bodyOnly, /where\('isActive', '==', true\)/);
    assert.match(catalogServiceSource.slice(start, start + 1200), /sortOrder/);
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
