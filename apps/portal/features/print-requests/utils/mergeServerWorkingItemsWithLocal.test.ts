import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PrintRequestItem } from '@fresh-prints/shared/types/printRequest/printRequest.types';

import { mergeServerWorkingItemsWithLocal } from './mergeServerWorkingItemsWithLocal';
import { OPTIMISTIC_PRINT_REQUEST_ITEM_ID_PREFIX } from './optimisticPrintRequestItemId';

function stamp(ms: number): PrintRequestItem['createdAt'] {
  return {
    toMillis: () => ms,
    toDate: () => new Date(ms),
  } as PrintRequestItem['createdAt'];
}

function item(
  overrides: Partial<PrintRequestItem> & Pick<PrintRequestItem, 'id'>,
): PrintRequestItem {
  return {
    printRequestId: 'req-1',
    quantity: 1,
    status: 'pending',
    sourceType: 'catalog_design',
    updatedAt: stamp(0),
    createdAt: overrides.createdAt ?? stamp(0),
    ...overrides,
  } as PrintRequestItem;
}

describe('mergeServerWorkingItemsWithLocal', () => {
  it('keeps optimistic catalog stubs when the server snapshot is still empty', () => {
    const local = [
      item({ id: 'optimistic:design-b', designId: 'design-b', createdAt: stamp(200) }),
      item({ id: 'optimistic:design-a', designId: 'design-a', createdAt: stamp(100) }),
    ];

    const merged = mergeServerWorkingItemsWithLocal([], local);

    assert.deepEqual(
      merged.map((entry) => entry.id),
      ['optimistic:design-b', 'optimistic:design-a'],
    );
  });

  it('keeps a local-only real row when the server list is partial (rapid first-add race)', () => {
    const local = [
      item({ id: 'real-b', designId: 'design-b', createdAt: stamp(200) }),
      item({ id: 'real-a', designId: 'design-a', createdAt: stamp(100) }),
    ];
    const server = [item({ id: 'real-a', designId: 'design-a', createdAt: stamp(100) })];

    const merged = mergeServerWorkingItemsWithLocal(server, local);

    assert.deepEqual(
      merged.map((entry) => entry.id),
      ['real-b', 'real-a'],
    );
  });

  it('drops an optimistic stub once the server has the same catalog design', () => {
    const local = [
      item({ id: 'optimistic:design-a', designId: 'design-a', createdAt: stamp(50) }),
      item({ id: 'optimistic:design-b', designId: 'design-b', createdAt: stamp(150) }),
    ];
    const server = [
      item({ id: 'real-a', designId: 'design-a', quantity: 2, createdAt: stamp(100) }),
    ];

    const merged = mergeServerWorkingItemsWithLocal(server, local);

    assert.deepEqual(
      merged.map((entry) => entry.id),
      ['optimistic:design-b', 'real-a'],
    );
    assert.equal(merged.find((entry) => entry.id === 'real-a')?.quantity, 2);
  });

  it('keeps duplicate optimistic rows until the server lists that item id', () => {
    const pendingId = `${OPTIMISTIC_PRINT_REQUEST_ITEM_ID_PREFIX}abc`;
    const local = [item({ id: pendingId, designId: 'design-a', createdAt: stamp(300) })];
    const server = [item({ id: 'real-other', designId: 'design-b', createdAt: stamp(100) })];

    const merged = mergeServerWorkingItemsWithLocal(server, local);

    assert.deepEqual(
      merged.map((entry) => entry.id),
      [pendingId, 'real-other'],
    );
  });
});
