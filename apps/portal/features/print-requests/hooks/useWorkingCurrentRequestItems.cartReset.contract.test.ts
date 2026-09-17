import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Post-queue parked-draft restore: `resetWorkingCart()` can clear the cart ref while React
 * still selects the restored Working request. Without a reset-generation dependency, the
 * ownership effect does not re-run and Library Add stays disabled until hard refresh.
 */
describe('useWorkingCurrentRequestItems cart reset rebind contract', () => {
  const source = readFileSync(
    resolve(import.meta.dirname, './useWorkingCurrentRequestItems.ts'),
    'utf8',
  );

  it('bumps cartResetGeneration from resetWorkingCart and depends on it in the ownership effect', () => {
    assert.match(source, /const \[cartResetGeneration, setCartResetGeneration\]/);
    assert.match(
      source,
      /setCartResetGeneration\(\(current\) => current \+ 1\)/,
    );
    assert.match(
      source,
      /\}, \[cartResetGeneration, reloadWorkingItems, resetWorkingCart, workingRequest\?\.id\]\);/,
    );
  });

  it('rebinds loading state when ref is empty but a working request id is present', () => {
    assert.match(
      source,
      /if \(!previousId && nextId\) \{\s*setHydratedWorkingRequestId\(undefined\);\s*setIsLoadingItems\(true\);\s*\}/,
    );
  });

  it('always clears isLoadingItems for the latest reload epoch (including silent)', () => {
    assert.match(
      source,
      /finally \{\s*\/\/ Always clear loading for the latest epoch[\s\S]*?if \(epoch === reloadEpochRef\.current\) \{\s*setIsLoadingItems\(false\);\s*\}/,
    );
    assert.doesNotMatch(
      source,
      /if \(!options\?\.silent && epoch === reloadEpochRef\.current\) \{\s*setIsLoadingItems\(false\);/,
    );
  });
});
