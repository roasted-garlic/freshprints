import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { resolveMissingDesignIds } from './catalogService';

describe('catalogService.resolveMissingDesignIds (item 1: cold-start manifest gap)', () => {
  it('returns an empty list when every requested design was found (fully successful response)', () => {
    const requestedIds = ['design-a', 'design-b', 'design-c'];
    const found = [{ id: 'design-a' }, { id: 'design-b' }, { id: 'design-c' }];
    const missing = resolveMissingDesignIds(requestedIds, found);
    assert.deepEqual(missing, []);
  });

  it('returns only the missing subset when the generated response is successful but incomplete', () => {
    const requestedIds = ['design-a', 'design-b', 'design-c'];
    const found = [{ id: 'design-a' }, { id: 'design-c' }];
    const missing = resolveMissingDesignIds(requestedIds, found);
    assert.deepEqual(missing, ['design-b']);
  });

  it('never expands beyond the exact missing subset — not the full requested set', () => {
    const requestedIds = ['design-a', 'design-b', 'design-c', 'design-d'];
    const found = [{ id: 'design-a' }];
    const missing = resolveMissingDesignIds(requestedIds, found);
    assert.deepEqual(missing, ['design-b', 'design-c', 'design-d']);
    assert.ok(missing.length < requestedIds.length);
  });

  it('returns every requested id when the generated response found none of them', () => {
    const requestedIds = ['design-a', 'design-b'];
    const missing = resolveMissingDesignIds(requestedIds, []);
    assert.deepEqual(missing, requestedIds);
  });

  it('preserves requested order and de-duplicates only via the found-id set, not by sorting', () => {
    const requestedIds = ['design-z', 'design-a', 'design-m'];
    const found = [{ id: 'design-a' }];
    const missing = resolveMissingDesignIds(requestedIds, found);
    assert.deepEqual(missing, ['design-z', 'design-m']);
  });
});

describe('Phase 1A catalogService page cache + home pool wiring', () => {
  it('exports page-cache invalidation and wraps sort-fallback + home pool with bounded cache', () => {
    const source = readFileSync(
      'apps/portal/features/catalog/services/catalogService.ts',
      'utf8',
    );
    assert.match(source, /createBoundedAsyncCache/);
    assert.match(source, /invalidateCatalogPageCaches/);
    assert.match(source, /catalogPageCache\.get/);
    assert.match(source, /homeDiscoveryPoolCache\.get/);
    assert.match(source, /CATALOG_PAGE_CACHE_TTL_MS/);
  });
});
