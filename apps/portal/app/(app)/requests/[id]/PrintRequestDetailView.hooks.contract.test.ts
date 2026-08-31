/**
 * Static contract: PrintRequestDetailView must not declare hooks after loading/error early
 * returns — that pattern caused the owner QA blocker (React hook order regression, 2026-08-31).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, 'PrintRequestDetailView.tsx'), 'utf8');

function indexOfOrFail(pattern: string | RegExp, label: string): number {
  const index = typeof pattern === 'string' ? source.indexOf(pattern) : source.search(pattern);
  assert.ok(index >= 0, `expected to find ${label} in PrintRequestDetailView.tsx`);
  return index;
}

describe('PrintRequestDetailView hook-order contract', () => {
  it('declares handleUnqueueFromShow before loading/error early returns', () => {
    const unqueueCallbackIndex = indexOfOrFail(
      'const handleUnqueueFromShow = useCallback',
      'handleUnqueueFromShow useCallback',
    );
    const loadingReturnIndex = indexOfOrFail('if (isLoading)', 'isLoading early return');
    const errorReturnIndex = indexOfOrFail(
      'if (error || !printRequest)',
      'error/not-found early return',
    );

    assert.ok(
      unqueueCallbackIndex < loadingReturnIndex,
      'handleUnqueueFromShow must be declared before the loading early return',
    );
    assert.ok(
      unqueueCallbackIndex < errorReturnIndex,
      'handleUnqueueFromShow must be declared before the error early return',
    );
  });

  it('does not declare useCallback after the loading early return', () => {
    const loadingReturnIndex = indexOfOrFail('if (isLoading)', 'isLoading early return');
    const trailingCallbacks = [...source.slice(loadingReturnIndex).matchAll(/\buseCallback\(/g)];
    assert.equal(
      trailingCallbacks.length,
      0,
      'no useCallback declarations may appear after the loading early return',
    );
  });
});
