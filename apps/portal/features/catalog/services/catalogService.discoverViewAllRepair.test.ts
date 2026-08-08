import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import {
  getDesignSortValue,
  sliceSortedDesignsAfterCursor,
  sortCatalogDesignsByField,
} from './catalogService';
import type { CatalogDesign } from '../types/catalog.types';

function design(partial: Partial<CatalogDesign> & Pick<CatalogDesign, 'id'>): CatalogDesign {
  return {
    title: partial.title ?? partial.id,
    tags: [],
    thumbnailPath: 't',
    width: 1,
    height: 1,
    requestCount: 0,
    favoriteCount: 0,
    ...partial,
  };
}

describe('Discover View All repair helpers (Popular + category ready-order)', () => {
  const service = readFileSync(
    'apps/portal/features/catalog/services/catalogService.ts',
    'utf8',
  );

  it('Popular View All repair keeps requestCount metric sort (not readyAt demotion)', () => {
    assert.match(service, /isMetricSortField\(sortField\)/);
    assert.match(service, /listReadyDesignsPageByClientSortedMembership\(listQuery, sortField\)/);
    assert.doesNotMatch(
      service,
      /isMetricSortField\(sortField\)[\s\S]{0,400}sortField: 'readyAt'/,
    );
  });

  it('sortCatalogDesignsByField ranks Popular with missing requestCount as 0', () => {
    const ranked = sortCatalogDesignsByField(
      [
        design({ id: 'a', requestCount: 0, readyAtMs: 9_000 }),
        design({ id: 'b', requestCount: 5, readyAtMs: 1_000 }),
        design({ id: 'c', requestCount: 2, readyAtMs: 8_000 }),
      ],
      'requestCount',
    );
    assert.deepEqual(
      ranked.map((item) => item.id),
      ['b', 'c', 'a'],
    );
  });

  it('category ready-order uses readyAtMs ?? createdAtMs (legacy + newly ready)', () => {
    const newlyReady = design({
      id: 'new-ready',
      createdAtMs: 100,
      readyAtMs: 10_000,
    });
    const legacyMissingReadyAt = design({
      id: 'legacy',
      createdAtMs: 8_000,
    });
    const olderReady = design({
      id: 'older-ready',
      createdAtMs: 9_000,
      readyAtMs: 7_000,
    });

    const ranked = sortCatalogDesignsByField(
      [legacyMissingReadyAt, olderReady, newlyReady],
      'readyAt',
    );

    assert.deepEqual(
      ranked.map((item) => item.id),
      ['new-ready', 'legacy', 'older-ready'],
    );
    assert.equal(getDesignSortValue(legacyMissingReadyAt, 'readyAt'), 8_000);
    assert.equal(getDesignSortValue(newlyReady, 'readyAt'), 10_000);
  });

  it('ready-order repair does not return createdAt order for mixed legacy docs', () => {
    // createdAt desc would be: older-ready (9k), legacy (8k), new-ready (100)
    // ready-order must be: new-ready (10k readyAt), legacy (8k createdAt fallback), older-ready (7k readyAt)
    const ranked = sortCatalogDesignsByField(
      [
        design({ id: 'older-ready', createdAtMs: 9_000, readyAtMs: 7_000 }),
        design({ id: 'legacy', createdAtMs: 8_000 }),
        design({ id: 'new-ready', createdAtMs: 100, readyAtMs: 10_000 }),
      ],
      'readyAt',
    );
    const createdAtOrder = sortCatalogDesignsByField(
      [
        design({ id: 'older-ready', createdAtMs: 9_000, readyAtMs: 7_000 }),
        design({ id: 'legacy', createdAtMs: 8_000 }),
        design({ id: 'new-ready', createdAtMs: 100, readyAtMs: 10_000 }),
      ],
      'createdAt',
    );

    assert.deepEqual(
      ranked.map((item) => item.id),
      ['new-ready', 'legacy', 'older-ready'],
    );
    assert.deepEqual(
      createdAtOrder.map((item) => item.id),
      ['older-ready', 'legacy', 'new-ready'],
    );
    assert.notDeepEqual(
      ranked.map((item) => item.id),
      createdAtOrder.map((item) => item.id),
    );
  });

  it('cursor slice preserves stable order after client-sorted membership', () => {
    const sorted = sortCatalogDesignsByField(
      [
        design({ id: 'd', requestCount: 1 }),
        design({ id: 'c', requestCount: 4 }),
        design({ id: 'b', requestCount: 4 }),
        design({ id: 'a', requestCount: 9 }),
      ],
      'requestCount',
    );
    assert.deepEqual(
      sorted.map((item) => item.id),
      ['a', 'c', 'b', 'd'],
    );

    const first = sliceSortedDesignsAfterCursor(sorted, 'requestCount', 2, undefined);
    assert.deepEqual(
      first.designs.map((item) => item.id),
      ['a', 'c'],
    );
    assert.equal(first.hasMore, true);
    assert.ok(first.nextCursor);

    const second = sliceSortedDesignsAfterCursor(sorted, 'requestCount', 2, first.nextCursor);
    assert.deepEqual(
      second.designs.map((item) => item.id),
      ['b', 'd'],
    );
    assert.equal(second.hasMore, false);
  });

  it('New This Week path still refuses createdAt demotion in sort fallback', () => {
    assert.match(service, /Never demote New This Week to createdAt membership\/order/);
    assert.match(service, /sortField === 'readyAt' &&/);
    assert.match(service, /typeof listQuery\.readyAfterMs !== 'number'/);
    assert.match(service, /!listQuery\.skipClientSortRepair/);
  });

  it('Discover home pool skips client-sort repair (View All does not)', () => {
    assert.match(service, /skipClientSortRepair: true/);
    assert.match(service, /!listQuery\.skipClientSortRepair/);
    assert.match(service, /home merges pools and client-ranks/);
  });
});
