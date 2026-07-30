import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clearPortalShowQueueSubmissionsForTests,
  sharePortalShowQueueSubmission,
} from './portalShowQueueSubmissionOwner';

test.beforeEach(clearPortalShowQueueSubmissionsForTests);

test('concurrent submission callers share one promise per request and show', async () => {
  let calls = 0;
  const submit = async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 5));
    return 'queued';
  };
  const results = await Promise.all([
    sharePortalShowQueueSubmission('user:request:show', submit),
    sharePortalShowQueueSubmission('user:request:show', submit),
    sharePortalShowQueueSubmission('user:request:show', submit),
  ]);
  assert.equal(calls, 1);
  assert.deepEqual(results, ['queued', 'queued', 'queued']);
});

test('a rejected submission is evicted and a manual retry can run', async () => {
  let calls = 0;
  await assert.rejects(
    sharePortalShowQueueSubmission('user:request:show', async () => {
      calls += 1;
      throw new Error('expected');
    }),
  );
  const result = await sharePortalShowQueueSubmission('user:request:show', async () => {
    calls += 1;
    return 'queued';
  });
  assert.equal(result, 'queued');
  assert.equal(calls, 2);
});
