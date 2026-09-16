import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clearPortalAllocatableShowsReadCache,
  invalidatePortalAllocatableShowsCaches,
  readPortalAllocatableShowsCached,
  registerPortalAllocatableShowsSessionCacheClearer,
} from './portalAllocatableShowsReadCache';

test('readPortalAllocatableShowsCached dedupes in-flight loads', async () => {
  clearPortalAllocatableShowsReadCache();
  let loadCount = 0;

  const load = async () => {
    loadCount += 1;
    return {
      shows: [
        {
          id: 'show-1',
          productionStatus: 'open',
          allocatedQuantity: 0,
          customerAllocatedQuantity: 0,
          isAllocatable: true,
          isPastQueueCutoff: false,
          queueCutoffAt: null,
        },
      ],
      portalQueueCutoffHoursBeforeStart: 5,
    };
  };

  const first = await readPortalAllocatableShowsCached(load);
  const second = await readPortalAllocatableShowsCached(load);

  assert.equal(loadCount, 1);
  assert.deepEqual(second, first);

  clearPortalAllocatableShowsReadCache();
});

test('invalidatePortalAllocatableShowsCaches forces the next list load and clears session cache', async () => {
  clearPortalAllocatableShowsReadCache();
  let sessionCleared = 0;
  registerPortalAllocatableShowsSessionCacheClearer(() => {
    sessionCleared += 1;
  });

  let loadCount = 0;
  const load = async () => {
    loadCount += 1;
    return {
      shows: [
        {
          id: 'show-1',
          productionStatus: 'open',
          allocatedQuantity: loadCount === 1 ? 29 : 4,
          customerAllocatedQuantity: loadCount === 1 ? 29 : 4,
          isAllocatable: true,
          isPastQueueCutoff: false,
          queueCutoffAt: null,
        },
      ],
      portalQueueCutoffHoursBeforeStart: 5,
    };
  };

  const first = await readPortalAllocatableShowsCached(load);
  assert.equal(first.shows[0]?.allocatedQuantity, 29);
  assert.equal(loadCount, 1);

  // Still within TTL — would reuse without invalidate.
  const cached = await readPortalAllocatableShowsCached(load);
  assert.equal(cached.shows[0]?.allocatedQuantity, 29);
  assert.equal(loadCount, 1);

  invalidatePortalAllocatableShowsCaches();
  assert.equal(sessionCleared, 1);

  const fresh = await readPortalAllocatableShowsCached(load);
  assert.equal(fresh.shows[0]?.allocatedQuantity, 4);
  assert.equal(loadCount, 2);

  registerPortalAllocatableShowsSessionCacheClearer(null);
  clearPortalAllocatableShowsReadCache();
});
