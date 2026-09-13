import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clearPortalPublicShowsReadCache,
  getPortalPublicShowsReadCacheSnapshot,
  readPortalPublicShowsCached,
} from './portalPublicShowsReadCache';

test('readPortalPublicShowsCached dedupes in-flight loads and honors TTL', async () => {
  clearPortalPublicShowsReadCache();
  let loadCount = 0;

  const load = async () => {
    loadCount += 1;
    return { shows: [{ id: 'show-1', productionStatus: 'open' as const, uniquePublicCatalogDesignCount: 1, scheduledStartAt: null }] };
  };

  const first = await readPortalPublicShowsCached(load);
  const second = await readPortalPublicShowsCached(load);

  assert.equal(loadCount, 1);
  assert.deepEqual(second, first);

  clearPortalPublicShowsReadCache();
});

test('getPortalPublicShowsReadCacheSnapshot exposes cached response freshness', async () => {
  clearPortalPublicShowsReadCache();
  assert.equal(getPortalPublicShowsReadCacheSnapshot(), null);

  await readPortalPublicShowsCached(async () => ({
    shows: [
      {
        id: 'show-2',
        productionStatus: 'open',
        uniquePublicCatalogDesignCount: 2,
        scheduledStartAt: '2026-09-02T18:00:00.000Z',
      },
    ],
  }));

  const snapshot = getPortalPublicShowsReadCacheSnapshot();
  assert.ok(snapshot);
  assert.equal(snapshot.isFresh, true);
  assert.equal(snapshot.response.shows[0]?.id, 'show-2');

  clearPortalPublicShowsReadCache();
  assert.equal(getPortalPublicShowsReadCacheSnapshot(), null);
});

test('readPortalPublicShowsCached dedupes concurrent identical loads', async () => {
  clearPortalPublicShowsReadCache();
  let loadCount = 0;

  const load = async () => {
    loadCount += 1;
    await new Promise((resolve) => setTimeout(resolve, 20));
    return {
      shows: [
        {
          id: 'show-concurrent',
          productionStatus: 'open' as const,
          uniquePublicCatalogDesignCount: 0,
          scheduledStartAt: null,
        },
      ],
    };
  };

  const [left, right] = await Promise.all([
    readPortalPublicShowsCached(load),
    readPortalPublicShowsCached(load),
  ]);

  assert.equal(loadCount, 1);
  assert.deepEqual(left, right);
  clearPortalPublicShowsReadCache();
});
