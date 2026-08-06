import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('Amendment 2 — Portal category freshness (Case A companion)', () => {
  it('listActiveCategories remains uncached Firestore-only (no module TTL staleness)', () => {
    const source = read('apps/portal/features/catalog/services/catalogService.ts');
    const start = source.indexOf('async listActiveCategories');
    const block = source.slice(start, start + 900);
    assert.match(block, /where\('isActive', '==', true\)/);
    assert.match(block, /mapPortalActiveCategory/);
    assert.match(block, /sortPortalCatalogCategories/);
    assert.doesNotMatch(block, /catalogCategoriesCache|CATALOG_CATEGORIES_TTL/);
    assert.doesNotMatch(block, /loadClientTaxonomy|listDiscoverDesigns/);
  });

  it('useCatalogCategories reloads on focus/visibility (no polling, no listener)', () => {
    const source = read('apps/portal/features/catalog/hooks/useCatalogCategories.ts');
    assert.match(source, /addEventListener\('focus'/);
    assert.match(source, /visibilitychange/);
    assert.doesNotMatch(source, /setInterval|setTimeout|onSnapshot/);
    assert.match(source, /listActiveCategories/);
  });

  it('archive-to-inactive becomes visible after a fresh listActiveCategories load', () => {
    // Discriminator vs c15a7be: freshness is focus/reload of Firestore, not mapper-only.
    const hook = read('apps/portal/features/catalog/hooks/useCatalogCategories.ts');
    assert.match(hook, /Freshness contract \(Amendment 2\)/);
    assert.match(hook, /Studio archive\/restore/);
  });
});
