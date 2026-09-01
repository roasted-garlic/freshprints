import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

describe('print request detail post-queue hydration contract', () => {
  it('hydrates schedules and allocations before the queue-success handler settles', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, '../../../app/(app)/requests/[id]/PrintRequestDetailView.tsx'),
      'utf8',
    );

    assert.match(source, /clearPortalPrintRequestReadCache\(\)/);
    assert.match(source, /buildRequestDetailHref\([^,]+,\s*\{\s*from:\s*'working'\s*\}\)/);
    assert.match(
      source,
      /await Promise\.all\(\[reloadRequestSchedules\(\), loadAllocationState\(\)\]\)/,
    );
  });

  it('resets progress watermark and applies local unqueue state before server refresh', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, '../../../app/(app)/requests/[id]/PrintRequestDetailView.tsx'),
      'utf8',
    );

    assert.match(source, /progressWatermarkRef\.current = \{ printRequestId: result\.printRequestId, stage: null \}/);
    assert.match(source, /reconcileUnqueued\(result\.requestStatus\)/);
    assert.match(source, /clearSchedules\(\)/);
  });

  it('does not route stuck-heal through the shared unqueue error hook', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, '../../../app/(app)/requests/[id]/PrintRequestDetailView.tsx'),
      'utf8',
    );

    assert.match(source, /portalShowSelectionService\.unqueuePrintRequestFromShow/);
    assert.match(source, /resolveStuckActiveNeedsEditingHeal/);
  });
});
