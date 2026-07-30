import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { withTimeout } from './withTimeout';

function delay<T>(ms: number, value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function neverResolves<T>(): Promise<T> {
  return new Promise(() => {
    // Simulates a hung getBytes() call — intentionally never settles.
  });
}

describe('withTimeout', () => {
  it('resolves with the underlying value when it settles before the timeout', async () => {
    const result = await withTimeout(delay(5, 'ok'), 200, 'timed out');
    assert.equal(result, 'ok');
  });

  it('rejects with the timeout message when the promise never settles — regardless of "payload size"', async () => {
    // The bound is purely time-based; a large-file getBytes() call and a small-file one are both
    // wrapped identically, so simulating a hang with a promise that never resolves is a valid proxy
    // for "a 40 MB fallback download that never completes" — the timeout fires the same either way.
    await assert.rejects(withTimeout(neverResolves(), 20, 'preview timed out'), /preview timed out/);
  });

  it('rejects with the original error when the promise rejects before the timeout', async () => {
    const failing = Promise.reject(new Error('network error'));
    await assert.rejects(withTimeout(failing, 200, 'timed out'), /network error/);
  });

  it('does not fire the timeout after the promise has already resolved (no stray rejection)', async () => {
    const result = await withTimeout(delay(5, 'fast'), 50, 'timed out');
    assert.equal(result, 'fast');
    // Wait past the original timeout window to confirm no unhandled rejection surfaces.
    await delay(60, undefined);
  });
});
