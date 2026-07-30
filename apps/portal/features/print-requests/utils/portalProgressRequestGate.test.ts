import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PortalProgressRequestGate } from './portalProgressRequestGate';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe('PortalProgressRequestGate', () => {
  it('coalesces overlapping timer/focus refreshes into one request', async () => {
    const gate = new PortalProgressRequestGate();
    const pending = deferred<string>();
    let calls = 0;
    const values: string[] = [];
    const first = gate.run(() => { calls += 1; return pending.promise; }, (value) => values.push(value), assert.fail);
    const second = gate.run(() => { calls += 1; return Promise.resolve('wrong'); }, (value) => values.push(value), assert.fail);
    assert.equal(first, second);
    assert.equal(calls, 1);
    pending.resolve('printing');
    await first;
    assert.deepEqual(values, ['printing']);
  });

  it('rejects stale success and stale error after request invalidation', async () => {
    const gate = new PortalProgressRequestGate();
    const staleSuccess = deferred<string>();
    const values: string[] = [];
    const errors: unknown[] = [];
    const first = gate.run(() => staleSuccess.promise, (value) => values.push(value), (error) => errors.push(error));
    gate.invalidate();
    staleSuccess.resolve('show-a');
    await first;
    assert.deepEqual(values, []);

    const staleError = deferred<string>();
    const second = gate.run(() => staleError.promise, (value) => values.push(value), (error) => errors.push(error));
    gate.invalidate();
    staleError.reject(new Error('stale'));
    await second;
    assert.deepEqual(errors, []);
  });
});
