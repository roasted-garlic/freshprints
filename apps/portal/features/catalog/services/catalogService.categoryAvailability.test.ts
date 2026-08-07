import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import {
  MAX_ACTIVE_CATEGORIES_FOR_COUNT,
  TOO_MANY_ACTIVE_CATEGORIES_MESSAGE,
  selectCustomerVisibleCategories,
  sortPortalCatalogCategories,
} from './catalogService';
import type { CatalogCategory } from '../types/catalog.types';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

function category(
  id: string,
  name: string,
  sortOrder: number,
): CatalogCategory {
  return { id, name, sortOrder };
}

describe('Amendment 3 — selectCustomerVisibleCategories (fails on bc893f6 all-actives)', () => {
  it('excludes active categories with zero ready count', async () => {
    const active = sortPortalCatalogCategories([
      category('occasions', 'Occasions', 0),
      category('animals', 'Animals', 1),
    ]);
    const counts = new Map([
      ['occasions', 0],
      ['animals', 4],
    ]);

    const visible = await selectCustomerVisibleCategories(active, async (id) => {
      assert.ok(counts.has(id), `unexpected category counted: ${id}`);
      return counts.get(id)!;
    });

    assert.deepEqual(
      visible.map((item) => item.id),
      ['animals'],
    );
  });

  it('includes active categories with ready count greater than zero', async () => {
    const active = [category('sports', 'Sports', 0)];
    const visible = await selectCustomerVisibleCategories(active, async () => 1);
    assert.equal(visible.length, 1);
    assert.equal(visible[0]?.id, 'sports');
  });

  it('counts every active category id (global — not a loaded design page)', async () => {
    const active = [
      category('a', 'A', 0),
      category('b', 'B', 1),
      category('c', 'C', 2),
    ];
    const seen: string[] = [];
    await selectCustomerVisibleCategories(active, async (id) => {
      seen.push(id);
      return id === 'b' ? 2 : 0;
    });
    assert.deepEqual(seen, ['a', 'b', 'c']);
  });

  it('preserves existing category ordering after filtering', async () => {
    const active = sortPortalCatalogCategories([
      category('beta', 'Beta', 1),
      category('alpha', 'Alpha', 1),
      category('first', 'First', 0),
      category('empty', 'Empty', 0),
    ]);
    const visible = await selectCustomerVisibleCategories(active, async (id) =>
      id === 'empty' ? 0 : 3,
    );
    assert.deepEqual(
      visible.map((item) => item.id),
      ['first', 'alpha', 'beta'],
    );
  });

  it('fails closed when mapped active categories exceed the count cap', async () => {
    const active = Array.from({ length: MAX_ACTIVE_CATEGORIES_FOR_COUNT + 1 }, (_, index) =>
      category(`c${index}`, `Cat ${index}`, index),
    );
    let countCalls = 0;
    await assert.rejects(
      () =>
        selectCustomerVisibleCategories(active, async () => {
          countCalls += 1;
          return 1;
        }),
      (error: unknown) =>
        error instanceof Error && error.message === TOO_MANY_ACTIVE_CATEGORIES_MESSAGE,
    );
    assert.equal(countCalls, 0, 'must not count when over the cap');
  });

  it('allows exactly MAX_ACTIVE_CATEGORIES_FOR_COUNT categories', async () => {
    const active = Array.from({ length: MAX_ACTIVE_CATEGORIES_FOR_COUNT }, (_, index) =>
      category(`c${index}`, `Cat ${index}`, index),
    );
    const visible = await selectCustomerVisibleCategories(active, async () => 1);
    assert.equal(visible.length, MAX_ACTIVE_CATEGORIES_FOR_COUNT);
  });

  it('fails the complete load when any aggregate rejects (no partial / all-active fallback)', async () => {
    const active = [
      category('ok', 'Ok', 0),
      category('bad', 'Bad', 1),
      category('later', 'Later', 2),
    ];
    await assert.rejects(
      () =>
        selectCustomerVisibleCategories(active, async (id) => {
          if (id === 'bad') {
            throw new Error('aggregate failed');
          }
          return 5;
        }),
      /aggregate failed/,
    );
  });
});

describe('Amendment 3 — listActiveCategories wires ready counts (source contract)', () => {
  it('filters via selectCustomerVisibleCategories and countReadyDesigns({ categoryId })', () => {
    const source = read('apps/portal/features/catalog/services/catalogService.ts');
    const start = source.indexOf('async listActiveCategories');
    assert.ok(start >= 0);
    const facetDoc = source.indexOf('Tags for the Portal tag modal', start);
    assert.ok(facetDoc > start);
    const block = source.slice(start, facetDoc);

    assert.match(block, /selectCustomerVisibleCategories/);
    assert.match(block, /countReadyDesigns\(\{\s*categoryId/);
    assert.match(block, /mapPortalActiveCategory/);
    assert.match(block, /where\('isActive', '==', true\)/);
    assert.match(block, /listActiveCategoriesInFlight/);
    assert.doesNotMatch(block, /loadClientTaxonomy/);
    assert.doesNotMatch(block, /portalCatalogAssetService/);
    assert.doesNotMatch(block, /listAllReadyDesigns|listReadyDesignsPage/);
    assert.doesNotMatch(block, /CATALOG_CATEGORIES_TTL|catalogCategoriesCache/);
  });

  it('countReadyDesigns constraints remain status==ready (+ categoryId)', () => {
    const source = read('apps/portal/features/catalog/services/catalogService.ts');
    const start = source.indexOf('function buildDesignFilterConstraints');
    const end = source.indexOf('function buildDesignListConstraints');
    const block = source.slice(start, end);
    assert.match(block, /where\('status', '==', 'ready'\)/);
    assert.match(block, /where\('categoryId', '=='/);
  });

  it('listActiveCategoriesInFlight clears by load identity (not load.finally Promise)', () => {
    const source = read('apps/portal/features/catalog/services/catalogService.ts');
    const start = source.indexOf('async listActiveCategories');
    const facetDoc = source.indexOf('Tags for the Portal tag modal', start);
    const block = source.slice(start, facetDoc);
    // Discriminator vs first Amendment 3 draft: assigning load.finally(...) breaks clear-by-identity.
    assert.match(block, /listActiveCategoriesInFlight = load;/);
    assert.match(block, /if \(listActiveCategoriesInFlight === load\)/);
    assert.doesNotMatch(
      block,
      /listActiveCategoriesInFlight = load\.finally/,
    );
  });

  it('exports the Amendment 3 category count cap constant', () => {
    const source = read('apps/portal/features/catalog/services/catalogService.ts');
    assert.match(source, /MAX_ACTIVE_CATEGORIES_FOR_COUNT = 64/);
  });
});
