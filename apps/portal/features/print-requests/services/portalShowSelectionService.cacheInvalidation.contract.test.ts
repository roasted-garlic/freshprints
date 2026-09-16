import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const here = dirname(fileURLToPath(import.meta.url));
const serviceSource = readFileSync(join(here, 'portalShowSelectionService.ts'), 'utf8');

test('queue and unqueue success paths invalidate allocatable-shows caches', () => {
  assert.match(serviceSource, /invalidatePortalAllocatableShowsCaches/);

  const queueStart = serviceSource.indexOf('async queuePrintRequestToShow');
  const unqueueStart = serviceSource.indexOf('async unqueuePrintRequestFromShow');
  assert.ok(queueStart >= 0 && unqueueStart > queueStart);

  const queueBody = serviceSource.slice(queueStart, unqueueStart);
  assert.match(queueBody, /invalidatePortalAllocatableShowsCaches\(\)/);
  assert.match(queueBody, /return result/);

  const unqueueBody = serviceSource.slice(unqueueStart);
  assert.match(unqueueBody, /invalidatePortalAllocatableShowsCaches\(\)/);
  assert.match(unqueueBody, /return result/);

  // Failures must not clear — invalidate sits after the successful await, inside try.
  const queueInvalidate = queueBody.indexOf('invalidatePortalAllocatableShowsCaches()');
  const queueCatch = queueBody.indexOf('} catch (error)');
  assert.ok(queueInvalidate >= 0 && queueCatch > queueInvalidate);

  const unqueueInvalidate = unqueueBody.indexOf('invalidatePortalAllocatableShowsCaches()');
  const unqueueCatch = unqueueBody.indexOf('} catch (error)');
  assert.ok(unqueueInvalidate >= 0 && unqueueCatch > unqueueInvalidate);
});
