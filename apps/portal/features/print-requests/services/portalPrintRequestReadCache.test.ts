import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clearPortalPrintRequestReadCache,
  loadPortalPrintRequestReadCached,
  primePortalPrintRequestReadCache,
} from './portalPrintRequestReadCache';

test.beforeEach(() => clearPortalPrintRequestReadCache());

test('shares concurrent identical request-detail reads', async () => {
  let loads = 0;
  let release!: (value: string[]) => void;
  const pending = new Promise<string[]>((resolve) => {
    release = resolve;
  });
  const load = () => {
    loads += 1;
    return pending;
  };

  const first = loadPortalPrintRequestReadCached('user:items:request', load);
  const second = loadPortalPrintRequestReadCached('user:items:request', load);
  release(['item']);

  assert.deepEqual(await first, ['item']);
  assert.deepEqual(await second, ['item']);
  assert.equal(loads, 1);
});

test('reuses primed shell data and evicts rejected promises', async () => {
  primePortalPrintRequestReadCache('user:request:id', { id: 'id' });
  let loads = 0;
  assert.deepEqual(
    await loadPortalPrintRequestReadCached('user:request:id', async () => {
      loads += 1;
      return null;
    }),
    { id: 'id' },
  );
  assert.equal(loads, 0);

  await assert.rejects(
    loadPortalPrintRequestReadCached('user:items:failed', async () => {
      throw new Error('failed');
    }),
  );
  assert.deepEqual(
    await loadPortalPrintRequestReadCached('user:items:failed', async () => ['recovered']),
    ['recovered'],
  );
});

test('does not retain a stale completion after auth or mutation invalidation', async () => {
  let release!: (value: string[]) => void;
  const stale = loadPortalPrintRequestReadCached(
    'old-user:items:request',
    () => new Promise<string[]>((resolve) => {
      release = resolve;
    }),
  );
  clearPortalPrintRequestReadCache();
  release(['stale']);
  assert.deepEqual(await stale, ['stale']);

  let freshLoads = 0;
  assert.deepEqual(
    await loadPortalPrintRequestReadCached('old-user:items:request', async () => {
      freshLoads += 1;
      return ['fresh'];
    }),
    ['fresh'],
  );
  assert.equal(freshLoads, 1);
});
