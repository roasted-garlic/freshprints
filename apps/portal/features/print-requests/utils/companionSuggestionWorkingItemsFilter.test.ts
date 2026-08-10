import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PrintRequestItem } from '@fresh-prints/shared/types/printRequest/printRequest.types';

import {
  collectWorkingItemDesignIds,
  excludeDesignsInWorkingItems,
} from './companionSuggestionWorkingItemsFilter';

function stamp(ms: number): PrintRequestItem['createdAt'] {
  return { toMillis: () => ms, toDate: () => new Date(ms) } as PrintRequestItem['createdAt'];
}

function catalogItem(designId: string, overrides: Partial<PrintRequestItem> = {}): PrintRequestItem {
  return {
    id: `item-${designId}`,
    printRequestId: 'req-1',
    designId,
    sourceType: 'catalog_design',
    quantity: 1,
    status: 'pending',
    createdAt: stamp(0),
    updatedAt: stamp(0),
    ...overrides,
  } as PrintRequestItem;
}

describe('collectWorkingItemDesignIds', () => {
  it('collects design ids from working items, ignoring quantity/size differences', () => {
    const items = [
      catalogItem('A', { quantity: 3, sizeLabel: '4x4' }),
      catalogItem('A', { id: 'item-A-2', quantity: 1, sizeLabel: '8x8' }),
      catalogItem('D', { quantity: 5 }),
    ];
    const ids = collectWorkingItemDesignIds(items);
    assert.deepEqual([...ids].sort(), ['A', 'D']);
  });

  it('ignores items without a design id (e.g. customer uploads)', () => {
    const items = [
      { ...catalogItem('A'), designId: undefined, sourceType: 'customer_upload' } as PrintRequestItem,
      catalogItem('B'),
    ];
    const ids = collectWorkingItemDesignIds(items);
    assert.deepEqual([...ids], ['B']);
  });

  it('returns an empty set for an empty working request', () => {
    assert.equal(collectWorkingItemDesignIds([]).size, 0);
  });
});

describe('excludeDesignsInWorkingItems', () => {
  it('filters out companions whose design id is already in the working request', () => {
    const companions = [{ id: 'A' }, { id: 'D' }, { id: 'E' }];
    const workingItems = [catalogItem('A')];
    const remaining = excludeDesignsInWorkingItems(companions, workingItems);
    assert.deepEqual(remaining.map((design) => design.id), ['D', 'E']);
  });

  it('removes every companion when all of them are already in the working request', () => {
    const companions = [{ id: 'A' }, { id: 'D' }];
    const workingItems = [catalogItem('A'), catalogItem('D', { id: 'item-D-2' })];
    const remaining = excludeDesignsInWorkingItems(companions, workingItems);
    assert.deepEqual(remaining, []);
  });

  it('returns the original list unchanged when nothing is in the working request', () => {
    const companions = [{ id: 'A' }, { id: 'D' }];
    const remaining = excludeDesignsInWorkingItems(companions, []);
    assert.deepEqual(remaining, companions);
  });

  it('preserves companion order among the remaining designs', () => {
    const companions = [{ id: 'X' }, { id: 'A' }, { id: 'Y' }, { id: 'D' }];
    const workingItems = [catalogItem('A'), catalogItem('D', { id: 'item-D-2' })];
    const remaining = excludeDesignsInWorkingItems(companions, workingItems);
    assert.deepEqual(remaining.map((design) => design.id), ['X', 'Y']);
  });
});
