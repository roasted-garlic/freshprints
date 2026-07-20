import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PrintRequestItem } from '@fresh-prints/shared/types/printRequest/printRequest.types';

import { sortWorkingCurrentRequestItems } from './sortWorkingCurrentRequestItems';

function stamp(ms: number): PrintRequestItem['createdAt'] {
  return {
    toMillis: () => ms,
    toDate: () => new Date(ms),
  } as PrintRequestItem['createdAt'];
}

function item(
  overrides: Partial<PrintRequestItem> &
    Pick<PrintRequestItem, 'id'> &
    Partial<Pick<PrintRequestItem, 'sortOrder' | 'createdAt'>>,
): PrintRequestItem {
  return {
    printRequestId: 'req-1',
    quantity: 1,
    status: 'pending',
    updatedAt: stamp(0),
    createdAt: overrides.createdAt ?? stamp(0),
    ...overrides,
  } as PrintRequestItem;
}

describe('sortWorkingCurrentRequestItems', () => {
  it('orders by sortOrder descending (newest add first)', () => {
    const sorted = sortWorkingCurrentRequestItems([
      item({ id: 'a', sortOrder: 1, createdAt: stamp(300) }),
      item({ id: 'b', sortOrder: 3, createdAt: stamp(100) }),
      item({ id: 'c', sortOrder: 2, createdAt: stamp(200) }),
    ]);

    assert.deepEqual(
      sorted.map((entry) => entry.id),
      ['b', 'c', 'a'],
    );
  });

  it('falls back to createdAt descending when sortOrder is missing', () => {
    const sorted = sortWorkingCurrentRequestItems([
      item({ id: 'old', createdAt: stamp(100) }),
      item({ id: 'new', createdAt: stamp(300) }),
      item({ id: 'mid', createdAt: stamp(200) }),
    ]);

    assert.deepEqual(
      sorted.map((entry) => entry.id),
      ['new', 'mid', 'old'],
    );
  });

  it('falls back to id descending when createdAt and sortOrder tie (reverse of ascending tie-break)', () => {
    const sorted = sortWorkingCurrentRequestItems([
      item({ id: 'zzz', createdAt: stamp(0), sortOrder: 1 }),
      item({ id: 'aaa', createdAt: stamp(0), sortOrder: 1 }),
    ]);

    assert.deepEqual(
      sorted.map((entry) => entry.id),
      ['zzz', 'aaa'],
    );
  });

  it('does not prefer older createdAt over higher sortOrder', () => {
    const sorted = sortWorkingCurrentRequestItems([
      item({ id: 'newer-left-if-createdAt', sortOrder: 5, createdAt: stamp(999) }),
      item({ id: 'older-but-last', sortOrder: 1, createdAt: stamp(1) }),
    ]);

    assert.deepEqual(
      sorted.map((entry) => entry.id),
      ['newer-left-if-createdAt', 'older-but-last'],
    );
  });
});
