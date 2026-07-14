import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildCatalogUrlCacheKey,
  catalogPathFromUrlCacheKey,
  normalizeCatalogContentVersion,
  normalizeCatalogStoragePath,
} from './catalogUrlCacheKey';

describe('normalizeCatalogStoragePath', () => {
  it('trims paths and rejects empty values', () => {
    assert.equal(normalizeCatalogStoragePath(' /thumbnails/a.webp '), '/thumbnails/a.webp');
    assert.equal(normalizeCatalogStoragePath('   '), null);
    assert.equal(normalizeCatalogStoragePath(undefined), null);
  });
});

describe('normalizeCatalogContentVersion', () => {
  it('floors valid versions and defaults invalid ones to 0', () => {
    assert.equal(normalizeCatalogContentVersion(1_700_000_000_123.9), 1_700_000_000_123);
    assert.equal(normalizeCatalogContentVersion(undefined), 0);
    assert.equal(normalizeCatalogContentVersion(Number.NaN), 0);
    assert.equal(normalizeCatalogContentVersion(-5), 0);
  });
});

describe('buildCatalogUrlCacheKey', () => {
  it('versions the path so content updates miss the cache', () => {
    assert.equal(buildCatalogUrlCacheKey('/thumbnails/a.webp', 10), '/thumbnails/a.webp@10');
    assert.equal(buildCatalogUrlCacheKey('/thumbnails/a.webp', undefined), '/thumbnails/a.webp@0');
    assert.notEqual(
      buildCatalogUrlCacheKey('/thumbnails/a.webp', 10),
      buildCatalogUrlCacheKey('/thumbnails/a.webp', 11),
    );
  });
});

describe('catalogPathFromUrlCacheKey', () => {
  it('recovers the storage path from a versioned key', () => {
    assert.equal(catalogPathFromUrlCacheKey('/thumbnails/a.webp@42'), '/thumbnails/a.webp');
    assert.equal(catalogPathFromUrlCacheKey('/thumbnails/a@b.webp@99'), '/thumbnails/a@b.webp');
  });
});
