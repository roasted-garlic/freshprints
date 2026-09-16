import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const here = dirname(fileURLToPath(import.meta.url));
const hookSource = readFileSync(join(here, 'usePortalAllocatableShows.ts'), 'utf8');

test('hook registers session cache clearer for unified allocatable-shows invalidation', () => {
  assert.match(hookSource, /registerPortalAllocatableShowsSessionCacheClearer/);
  assert.match(hookSource, /function clearPortalAllocatableShowsSessionCache/);
  assert.match(hookSource, /sessionCachedShows = null/);
});
