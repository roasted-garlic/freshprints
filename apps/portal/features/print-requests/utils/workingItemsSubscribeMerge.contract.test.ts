import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

describe('working current request items subscribe merge contract', () => {
  it('merges full local cart excluding pending removals (not optimistic-only)', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, '../hooks/useWorkingCurrentRequestItems.ts'),
      'utf8',
    );

    assert.match(source, /subscribePrintRequestItems/);
    assert.match(
      source,
      /mergeServerWorkingItemsWithLocal\(\s*visibleItems,\s*current\.filter\(\(item\) => !pendingRemovedItemIdsRef\.current\.has\(item\.id\.trim\(\)\)\),/,
    );
    assert.doesNotMatch(
      source,
      /mergeServerWorkingItemsWithLocal\(\s*visibleItems,\s*current\.filter\(\(item\) => item\.id\.startsWith\('optimistic:'\)\)/,
    );
  });
});
