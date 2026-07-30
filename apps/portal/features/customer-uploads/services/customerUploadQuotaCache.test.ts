import assert from 'node:assert/strict';
import test from 'node:test';

import {
  invalidateCustomerUploadQuota,
  loadCustomerUploadQuotaCached,
} from './customerUploadQuotaCache';

test.beforeEach(() => invalidateCustomerUploadQuota());

test('shares concurrent quota loads and reuses the 45-second result', async () => {
  let calls = 0;
  const load = async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 5));
    return { remaining: 4 };
  };
  const [first, second] = await Promise.all([
    loadCustomerUploadQuotaCached('user:print_request', load, 100),
    loadCustomerUploadQuotaCached('user:print_request', load, 100),
  ]);
  assert.deepEqual(first, { remaining: 4 });
  assert.deepEqual(second, first);
  assert.equal(calls, 1);
});

test('rejection is evicted and invalidation permits an authoritative reload', async () => {
  await assert.rejects(
    loadCustomerUploadQuotaCached('user:print_request', async () => {
      throw new Error('expected');
    }),
  );
  assert.equal(
    await loadCustomerUploadQuotaCached('user:print_request', async () => 1),
    1,
  );
  invalidateCustomerUploadQuota('user:');
  assert.equal(
    await loadCustomerUploadQuotaCached('user:print_request', async () => 2),
    2,
  );
});
