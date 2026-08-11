import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildReadyPreviewFetchKey,
  resolvePreviewUrlsLimited,
} from './resolvePreviewUrlsLimited';

describe('resolvePreviewUrlsLimited', () => {
  it('skips localIds that already have a cached URL', async () => {
    let calls = 0;
    const result = await resolvePreviewUrlsLimited({
      alreadyHave: { a: 'https://cached' },
      concurrency: 4,
      getDownloadUrl: async () => {
        calls += 1;
        return 'https://new';
      },
      items: [
        { localId: 'a', previewStoragePath: '/a/preview.webp' },
        { localId: 'b', previewStoragePath: '/b/preview.webp' },
      ],
    });
    assert.equal(calls, 1);
    assert.deepEqual(result, { b: 'https://new' });
  });

  it('caps concurrent getDownloadUrl calls', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const items = Array.from({ length: 10 }, (_, index) => ({
      localId: `id-${index}`,
      previewStoragePath: `/p/${index}.webp`,
    }));

    await resolvePreviewUrlsLimited({
      alreadyHave: {},
      concurrency: 3,
      getDownloadUrl: async () => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 5));
        inFlight -= 1;
        return 'https://x';
      },
      items,
    });

    assert.ok(maxInFlight <= 3, `expected max concurrency <= 3, got ${maxInFlight}`);
  });
});

describe('buildReadyPreviewFetchKey', () => {
  it('only includes ready rows with preview paths', () => {
    const key = buildReadyPreviewFetchKey([
      { localId: '1', phase: 'ready', previewStoragePath: '/a' },
      { localId: '2', phase: 'processing', previewStoragePath: '/b' },
      { localId: '3', phase: 'ready', previewStoragePath: null },
    ]);
    assert.equal(key, '1:/a');
  });
});
