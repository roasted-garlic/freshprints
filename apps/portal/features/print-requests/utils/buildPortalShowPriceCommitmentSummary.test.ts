import assert from 'node:assert/strict';
import test from 'node:test';

import type { PrintRequestItem } from '@fresh-prints/shared/types/printRequest/printRequest.types';

import { buildPortalShowPriceCommitmentSummary } from './buildPortalShowPriceCommitmentSummary.ts';

function item(
  partial: Partial<PrintRequestItem> & Pick<PrintRequestItem, 'id' | 'printRequestId'>,
): PrintRequestItem {
  return {
    quantity: 1,
    status: 'pending',
    addedBy: 'u1',
    createdAt: {} as PrintRequestItem['createdAt'],
    updatedAt: {} as PrintRequestItem['updatedAt'],
    ...partial,
  };
}

test('returns null when there are no items', () => {
  assert.equal(buildPortalShowPriceCommitmentSummary([]), null);
});

test('prices pocket and full-size prints with default tiers', () => {
  const summary = buildPortalShowPriceCommitmentSummary([
    item({
      id: 'i1',
      printRequestId: 'r1',
      printWidthInches: 3,
      printHeightInches: 3,
      quantity: 2,
    }),
    item({
      id: 'i2',
      printRequestId: 'r1',
      printWidthInches: 10,
      printHeightInches: 10,
      quantity: 1,
    }),
  ]);

  assert.ok(summary);
  assert.equal(summary.tierQuantities.pocket, 2);
  assert.equal(summary.tierQuantities.standard_full_size, 1);
  assert.equal(summary.totalPriceUsd, 4);
});

test('honors remaining-quantity override for queue acknowledgment', () => {
  const summary = buildPortalShowPriceCommitmentSummary(
    [
      item({
        id: 'i1',
        printRequestId: 'r1',
        printWidthInches: 10,
        printHeightInches: 10,
        quantity: 5,
      }),
    ],
    () => 2,
  );

  assert.ok(summary);
  assert.equal(summary.totalQuantity, 2);
  assert.equal(summary.totalPriceUsd, 4);
});

test('zero remaining quantity yields no summary', () => {
  assert.equal(
    buildPortalShowPriceCommitmentSummary(
      [
        item({
          id: 'i1',
          printRequestId: 'r1',
          printWidthInches: 10,
          printHeightInches: 10,
          quantity: 5,
        }),
      ],
      () => 0,
    ),
    null,
  );
});
