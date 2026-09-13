import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

describe('clear working request local reconciliation contract', () => {
  it('marks all current items pending-removed and clears local cart before the callable returns', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, '../context/PortalPrintRequestContext.tsx'),
      'utf8',
    );

    assert.match(source, /beginPendingItemRemovals\(workingItems\.map\(\(item\) => item\.id\)\)/);
    assert.match(
      source,
      /beginPendingItemRemovals\([\s\S]*?discardPendingWorkingItemLoads\(\);[\s\S]*?patchWorkingItems\(\[\]\);[\s\S]*?clearWorkingPrintRequest/,
    );
  });
});
