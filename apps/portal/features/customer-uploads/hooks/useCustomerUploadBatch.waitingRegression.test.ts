import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

describe('useCustomerUploadBatch worker queue row (Waiting… regression)', () => {
  it('starts uploads from the concurrency queue row, not a possibly-stale rowsRef snapshot', () => {
    const source = readFileSync(
      'apps/portal/features/customer-uploads/hooks/useCustomerUploadBatch.ts',
      'utf8',
    );
    const workerStart = source.indexOf('await runWithConcurrency(');
    assert.ok(workerStart > 0, 'expected runWithConcurrency call');
    const worker = source.slice(workerStart, workerStart + 2500);
    assert.match(worker, /!row\.file \|\| !row\.uploadId \|\| !row\.sourceStoragePath/);
    assert.doesNotMatch(worker, /const latest = rowsRef\.current\.find/);
    assert.match(worker, /uploadSourceFile\(\s*\n\s*row\.sourceStoragePath,\s*\n\s*row\.file,/);
  });
});
