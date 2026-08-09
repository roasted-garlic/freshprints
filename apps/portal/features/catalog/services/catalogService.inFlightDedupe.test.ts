import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

/**
 * Proves the in-flight clear pattern used by listActiveCategories:
 * store the load Promise, clear by identity in finally — not assign load.finally(...).
 */
describe('Amendment 3 — in-flight Promise clear-by-identity', () => {
  it('sequential callers after settle start a new load (does not retain first result forever)', async () => {
    let inFlight: Promise<number> | null = null;
    let generation = 0;

    async function loadOnce(): Promise<number> {
      if (inFlight) {
        return inFlight;
      }
      const current = ++generation;
      const load = Promise.resolve(current);
      inFlight = load;
      void load.finally(() => {
        if (inFlight === load) {
          inFlight = null;
        }
      });
      return load;
    }

    assert.equal(await loadOnce(), 1);
    assert.equal(await loadOnce(), 2);
    assert.equal(generation, 2);
  });

  it('broken finally-assignment pattern retains the first settle forever', async () => {
    let inFlight: Promise<number> | null = null;
    let generation = 0;

    async function loadBroken(): Promise<number> {
      if (inFlight) {
        return inFlight;
      }
      const current = ++generation;
      const load = Promise.resolve(current);
      // Pre-fix defect: assign finally Promise, then compare to load → never clears.
      inFlight = load.finally(() => {
        if (inFlight === load) {
          inFlight = null;
        }
      });
      return inFlight;
    }

    assert.equal(await loadBroken(), 1);
    assert.equal(await loadBroken(), 1, 'broken pattern must stick on first result');
    assert.equal(generation, 1);
  });
});
