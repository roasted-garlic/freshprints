import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clearPortalPublicShowsReadCache,
  readPortalPublicShowsCached,
} from './portalPublicShowsReadCache';

test('readPortalPublicShowsCached dedupes in-flight loads and honors TTL', async () => {
  clearPortalPublicShowsReadCache();
  let loadCount = 0;

  const load = async () => {
    loadCount += 1;
    return { shows: [{ id: 'show-1', productionStatus: 'open', uniquePublicCatalogDesignCount: 1 }] };
  };

  const first = await readPortalPublicShowsCached(load);
  const second = await readPortalPublicShowsCached(load);

  assert.equal(loadCount, 1);
  assert.deepEqual(second, first);

  clearPortalPublicShowsReadCache();
});
