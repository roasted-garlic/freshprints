import assert from 'node:assert/strict';
import test from 'node:test';
import { Timestamp } from 'firebase/firestore';
import type { PrintRequestItem } from '@fresh-prints/shared/types/printRequest/printRequest.types';
import { mergeProjectionPreferredPrintRequestItems } from './mergeProjectionPreferredPrintRequestItems';

function item(id: string, title: string, sortOrder: number): PrintRequestItem {
  const timestamp = Timestamp.fromMillis(1_000 + sortOrder);
  return {
    id,
    printRequestId: 'request-1',
    sourceType: 'catalog_design',
    designId: `design-${id}`,
    titleSnapshot: title,
    quantity: 1,
    status: 'pending',
    addedBy: 'customer-1',
    sortOrder,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

test('projection wins duplicate IDs and canonical fallback fills missing rows', () => {
  const result = mergeProjectionPreferredPrintRequestItems(
    [item('a', 'projection title', 1)],
    [item('a', 'canonical title', 1), item('b', 'canonical-only', 2)],
  );
  assert.deepEqual(result.map((entry) => entry.id), ['b', 'a']);
  assert.equal(result.find((entry) => entry.id === 'a')?.titleSnapshot, 'projection title');
});

test('projection-only and canonical-only transitions remain deterministic', () => {
  const projection = [item('p', 'projection', 3)];
  const canonical = [item('c', 'canonical', 4)];
  assert.deepEqual(
    mergeProjectionPreferredPrintRequestItems(projection, []).map((entry) => entry.id),
    ['p'],
  );
  assert.deepEqual(
    mergeProjectionPreferredPrintRequestItems([], canonical).map((entry) => entry.id),
    ['c'],
  );
});
