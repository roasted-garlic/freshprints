import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveMissingDesignIds } from './catalogService';

describe('catalogService.resolveMissingDesignIds (item 1: cold-start manifest gap)', () => {
  it('returns an empty list when every requested design was found (fully successful response)', () => {
    const requestedIds = ['design-a', 'design-b', 'design-c'];
    const found = [{ id: 'design-a' }, { id: 'design-b' }, { id: 'design-c' }];
    const missing = resolveMissingDesignIds(requestedIds, found);
    // A fully successful/complete generated-catalog response must cause zero fallback reads:
    // an empty missing-ids list is what getReadyDesignsByIds uses to skip the fallback loop
    // entirely (Array.prototype.map over `[]` performs zero iterations/zero reads).
    assert.deepEqual(missing, []);
  });

  it('returns only the missing subset when the generated response is successful but incomplete', () => {
    // Simulates a manifest cold-start gap: design-b was just approved and has not yet been
    // reflected in the cached generated-catalog snapshot, so the generated response omits it
    // without throwing (a successful, valid, but incomplete result).
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
