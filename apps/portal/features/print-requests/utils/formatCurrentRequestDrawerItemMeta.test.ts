import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatCurrentRequestDrawerItemMeta,
  formatCurrentRequestDrawerItemSize,
} from './formatCurrentRequestDrawerItemMeta';

describe('formatCurrentRequestDrawerItemSize', () => {
  it('formats dimensions without trailing zeros or in suffix', () => {
    assert.equal(
      formatCurrentRequestDrawerItemSize({
        printWidthInches: 3.5,
        printHeightInches: 3.89,
      }),
      '3.5 x 3.89',
    );
  });

  it('falls back to sizeLabel without in suffix', () => {
    assert.equal(
      formatCurrentRequestDrawerItemSize({
        sizeLabel: '4.00 x 4.00 in',
      }),
      '4.00 x 4.00',
    );
  });

  it('returns Size TBD when no size is available', () => {
    assert.equal(formatCurrentRequestDrawerItemSize({}), 'Size TBD');
  });
});

describe('formatCurrentRequestDrawerItemMeta', () => {
  it('includes size and quantity', () => {
    assert.equal(
      formatCurrentRequestDrawerItemMeta({
        printWidthInches: 3.5,
        printHeightInches: 3.89,
        quantity: 2,
      }),
      '3.5 x 3.89 · Qty 2',
    );
  });
});
