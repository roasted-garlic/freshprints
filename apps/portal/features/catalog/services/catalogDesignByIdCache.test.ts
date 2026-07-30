import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  clearCatalogDesignByIdCache,
  invalidateCatalogDesignById,
  loadCatalogDesignByIdCached,
} from './catalogDesignByIdCache';

describe('catalog design-by-ID cache', () => {
  it('deduplicates concurrent loads and reuses the resolved value', async () => {
    clearCatalogDesignByIdCache();
    let calls = 0;
    const load = async () => {
      calls += 1;
      return null;
    };
    await Promise.all([
      loadCatalogDesignByIdCached('one', load),
      loadCatalogDesignByIdCached('one', load),
    ]);
    await loadCatalogDesignByIdCached('one', load);
    assert.equal(calls, 1);
  });

  it('does not cache rejections and supports explicit invalidation', async () => {
    clearCatalogDesignByIdCache();
    let calls = 0;
    await assert.rejects(() => loadCatalogDesignByIdCached('bad', async () => {
      calls += 1;
      throw new Error('nope');
    }));
    await loadCatalogDesignByIdCached('bad', async () => {
      calls += 1;
      return null;
    });
    invalidateCatalogDesignById('bad');
    await loadCatalogDesignByIdCached('bad', async () => {
      calls += 1;
      return null;
    });
    assert.equal(calls, 3);
  });
});
