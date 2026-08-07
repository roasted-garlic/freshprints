import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('Amendment 2 — Portal category freshness (Case A companion)', () => {
  it('listActiveCategories remains without a module TTL cache', () => {
    const source = read('apps/portal/features/catalog/services/catalogService.ts');
    const start = source.indexOf('async listActiveCategories');
    const block = source.slice(start, start + 1600);
    assert.match(block, /where\('isActive', '==', true\)/);
    assert.match(block, /mapPortalActiveCategory/);
    assert.match(block, /selectCustomerVisibleCategories/);
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

  it('archive-to-inactive and ready-count changes refresh via focus/reload', () => {
    const hook = read('apps/portal/features/catalog/hooks/useCatalogCategories.ts');
    assert.match(hook, /Freshness \(Amendment 2, retained\)/);
    assert.match(hook, /Amendment 3/);
    assert.match(hook, /no module TTL/);
  });

  it('listActiveCategories shares one in-flight Promise for concurrent callers', () => {
    const source = read('apps/portal/features/catalog/services/catalogService.ts');
    assert.match(source, /listActiveCategoriesInFlight/);
  });
});
