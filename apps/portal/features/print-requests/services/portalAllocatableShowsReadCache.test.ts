import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clearPortalAllocatableShowsReadCache,
  readPortalAllocatableShowsCached,
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
