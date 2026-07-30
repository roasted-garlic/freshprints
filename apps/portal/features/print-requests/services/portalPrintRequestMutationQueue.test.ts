import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clearPortalPrintRequestMutationQueuesForTests,
  enqueuePortalPrintRequestMutation,
} from './portalPrintRequestMutationQueue';

test.beforeEach(clearPortalPrintRequestMutationQueuesForTests);

test('serializes mutations for one request without overlapping', async () => {
  let active = 0;
  let peak = 0;
  const order: string[] = [];
  const task = (label: string) =>
    enqueuePortalPrintRequestMutation('request', async () => {
      active += 1;
      peak = Math.max(peak, active);
      order.push(`${label}:start`);
      await new Promise((resolve) => setTimeout(resolve, 5));
      order.push(`${label}:end`);
      active -= 1;
    });

  await Promise.all([task('a'), task('b'), task('c')]);
  assert.equal(peak, 1);
  assert.deepEqual(order, ['a:start', 'a:end', 'b:start', 'b:end', 'c:start', 'c:end']);
});

test('a rejected mutation does not poison the next request mutation', async () => {
  const first = enqueuePortalPrintRequestMutation('request', async () => {
    throw new Error('expected');
  });
  const second = enqueuePortalPrintRequestMutation('request', async () => 'ok');
  await assert.rejects(first);
  assert.equal(await second, 'ok');
});

