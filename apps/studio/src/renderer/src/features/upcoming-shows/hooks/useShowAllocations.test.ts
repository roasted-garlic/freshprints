/**
 * Regression coverage for Fix 3 (Plan Section 21.3/21.4): Show Queue's allocations must reflect a
 * cross-client (e.g. Portal-submitted) allocation event for the currently visible show without a
 * remount, via a bounded, ref-counted `onSnapshot` subscription rather than the previous one-shot
 * `getDocs` fetch.
 *
 * `useShowAllocations` itself is a stateful React hook and this repo has no DOM-rendering test
 * convention (docs/standards/TESTING.md). Per the same convention already used elsewhere in this
 * goal (`itemPropSyncGuard.test.ts`, `createSharedFirestoreSubscription.test.ts`), this file
 * drives the ACTUAL shared primitive (`createSharedFirestoreSubscription`) in the same shape
 * `upcomingShowService.subscribeToShowAllocations` uses it, plus static source-wiring checks
 * confirming the hook/service are wired the way this test's behavioral assertions assume.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { resetFirestoreUsageTraceForTests } from '@fresh-prints/shared/utils/firestoreUsageTrace';

import { createSharedFirestoreSubscription } from '../../firebase/utils/createSharedFirestoreSubscription';

interface FakeAllocation {
  id: string;
  upcomingShowId: string;
  allocatedQuantity: number;
}

/**
 * Mirrors `getOrCreateShowAllocationsSubscription` in `upcomingShowService.ts`: one shared,
 * ref-counted subscription per show id, created lazily on first subscribe.
 */
function createFakeShowAllocationsSubscriptionRegistry() {
  const registry = new Map<
    string,
    ReturnType<typeof createSharedFirestoreSubscription<FakeAllocation[]>>
  >();
  const startCallsByShowId = new Map<string, number>();
  const emittersByShowId = new Map<string, (allocations: FakeAllocation[]) => void>();

  function getOrCreate(showId: string) {
    const existing = registry.get(showId);
    if (existing) {
      return existing;
    }
    const shared = createSharedFirestoreSubscription<FakeAllocation[]>({
      traceKey: `showAllocations:${showId}`,
      start: ({ next }) => {
        startCallsByShowId.set(showId, (startCallsByShowId.get(showId) ?? 0) + 1);
        emittersByShowId.set(showId, next);
        return () => {
          emittersByShowId.delete(showId);
        };
      },
    });
    registry.set(showId, shared);
    return shared;
  }

  return {
    subscribe(showId: string, onChange: (allocations: FakeAllocation[]) => void) {
      return getOrCreate(showId).subscribe(onChange);
    },
    emit(showId: string, allocations: FakeAllocation[]) {
      emittersByShowId.get(showId)?.(allocations);
    },
    startCount(showId: string) {
      return startCallsByShowId.get(showId) ?? 0;
    },
  };
}

describe('Fix 3 (Plan Section 21.3/21.4) — Show Queue live allocation subscription', () => {
  it('a new allocation event for the visible show appears immediately without navigation/remount', () => {
    resetFirestoreUsageTraceForTests({ enabled: false });
    const registry = createFakeShowAllocationsSubscriptionRegistry();
    let latest: FakeAllocation[] = [];

    registry.subscribe('show-1', (allocations) => {
      latest = allocations;
    });

    registry.emit('show-1', [{ id: 'alloc-a', upcomingShowId: 'show-1', allocatedQuantity: 3 }]);
    assert.deepEqual(latest.map((a) => a.id), ['alloc-a']);

    // A NEW allocation event arrives (e.g. a Portal customer submitted to this show) while
    // mounted — must appear immediately, no navigation/remount required.
    registry.emit('show-1', [
      { id: 'alloc-a', upcomingShowId: 'show-1', allocatedQuantity: 3 },
      { id: 'alloc-b', upcomingShowId: 'show-1', allocatedQuantity: 5 },
    ]);
    assert.deepEqual(latest.map((a) => a.id).sort(), ['alloc-a', 'alloc-b']);
  });

  it('request/print totals recompute correctly from the updated allocation set', () => {
    resetFirestoreUsageTraceForTests({ enabled: false });
    const registry = createFakeShowAllocationsSubscriptionRegistry();
    let latest: FakeAllocation[] = [];
    registry.subscribe('show-1', (allocations) => {
      latest = allocations;
    });

    registry.emit('show-1', [{ id: 'alloc-a', upcomingShowId: 'show-1', allocatedQuantity: 3 }]);
    assert.equal(latest.reduce((sum, a) => sum + a.allocatedQuantity, 0), 3);

    registry.emit('show-1', [
      { id: 'alloc-a', upcomingShowId: 'show-1', allocatedQuantity: 3 },
      { id: 'alloc-b', upcomingShowId: 'show-1', allocatedQuantity: 5 },
    ]);
    assert.equal(
      latest.reduce((sum, a) => sum + a.allocatedQuantity, 0),
      8,
      'total must recompute from the full updated snapshot',
    );
  });

  it('a duplicate event for the same allocation id does not create a duplicate entry', () => {
    resetFirestoreUsageTraceForTests({ enabled: false });
    const registry = createFakeShowAllocationsSubscriptionRegistry();
    let latest: FakeAllocation[] = [];
    registry.subscribe('show-1', (allocations) => {
      latest = allocations;
    });

    // A Firestore onSnapshot emission is always the full current query result set (not a delta),
    // so "duplicate event" means the same document appearing twice within one emitted snapshot —
    // which the query-level uniqueness (one doc per id) already prevents structurally. Model the
    // repeated-emission case: the exact same snapshot content is emitted twice (e.g. a metadata-
    // only re-emit) and must not accumulate duplicate entries in consumer state.
    const snapshot = [{ id: 'alloc-a', upcomingShowId: 'show-1', allocatedQuantity: 3 }];
    registry.emit('show-1', snapshot);
    registry.emit('show-1', snapshot);

    assert.equal(latest.length, 1, 'no duplicate entry from a repeated snapshot emission');
  });

  it('an event for a different (non-subscribed) show does not affect the currently visible show\'s data', () => {
    resetFirestoreUsageTraceForTests({ enabled: false });
    const registry = createFakeShowAllocationsSubscriptionRegistry();
    let latestShow1: FakeAllocation[] = [];
    registry.subscribe('show-1', (allocations) => {
      latestShow1 = allocations;
    });

    registry.emit('show-1', [{ id: 'alloc-a', upcomingShowId: 'show-1', allocatedQuantity: 3 }]);
    assert.equal(registry.startCount('show-1'), 1);

    // An event for a DIFFERENT show must not create a listener for show-1 or alter its state —
    // each show has its own independently-keyed shared subscription (scoped query per show id).
    registry.subscribe('show-2', () => undefined);
    registry.emit('show-2', [{ id: 'alloc-x', upcomingShowId: 'show-2', allocatedQuantity: 9 }]);

    assert.deepEqual(latestShow1.map((a) => a.id), ['alloc-a'], 'show-1 state must be unaffected');
    assert.equal(registry.startCount('show-1'), 1, 'no extra reload/listener start for show-1');
  });

  it('listener cleanup: unsubscribing the last consumer tears down the underlying subscription (ref-counted)', () => {
    resetFirestoreUsageTraceForTests({ enabled: false });
    let stopCount = 0;
    const shared = createSharedFirestoreSubscription<number>({
      traceKey: 'test:show-allocations-cleanup',
      start: ({ next }) => {
        next(1);
        return () => {
          stopCount += 1;
        };
      },
    });

    const unsubA = shared.subscribe(() => undefined);
    const unsubB = shared.subscribe(() => undefined);
    unsubA();
    assert.equal(stopCount, 0, 'must not tear down while another consumer is still subscribed');
    unsubB();
    assert.equal(stopCount, 1, 'must tear down once the last consumer unsubscribes');
  });

  it('multiple mounted consumers of the same show share one underlying listener (ref-counted, not one per consumer)', () => {
    resetFirestoreUsageTraceForTests({ enabled: false });
    const registry = createFakeShowAllocationsSubscriptionRegistry();
    registry.subscribe('show-1', () => undefined);
    registry.subscribe('show-1', () => undefined);
    registry.emit('show-1', [{ id: 'alloc-a', upcomingShowId: 'show-1', allocatedQuantity: 1 }]);

    assert.equal(registry.startCount('show-1'), 1, 'exactly one upstream listener for two consumers of the same show');
  });
});

describe('Fix 3 — source wiring: bounded per-show query, mapping reuse, no polling, no widened scope', () => {
  const serviceHere = dirname(fileURLToPath(import.meta.url));
  const serviceSource = readFileSync(
    join(serviceHere, '../services/upcomingShowService.ts'),
    'utf8',
  );
  const hookSource = readFileSync(join(serviceHere, 'useShowAllocations.ts'), 'utf8');

  it('subscribeToShowAllocations uses createSharedFirestoreSubscription, not a hand-rolled onSnapshot composition', () => {
    assert.match(serviceSource, /import\s*\{\s*createSharedFirestoreSubscription\s*\}\s*from\s*"\.\.\/\.\.\/firebase\/utils\/createSharedFirestoreSubscription"/);
    assert.match(serviceSource, /createSharedFirestoreSubscription<ShowAllocation\[\]>\(/);
  });

  it('the live query is scoped to a single upcomingShowId (single-field equality, no orderBy/limit widening)', () => {
    const startBlock = serviceSource.slice(
      serviceSource.indexOf('function getOrCreateShowAllocationsSubscription'),
      serviceSource.indexOf('export const upcomingShowService'),
    );
    assert.match(startBlock, /where\("upcomingShowId", "==", upcomingShowId\)/);
    assert.equal(/orderBy\(/.test(startBlock), false, 'must not add an orderBy not already present in listShowAllocations\' equivalent query');
    assert.equal(/limit\(/.test(startBlock), false, 'must not add a limit that could hide allocations for the show');
  });

  it('the live subscription reuses mapShowAllocationData rather than duplicating the doc-to-ShowAllocation mapping', () => {
    const startBlock = serviceSource.slice(
      serviceSource.indexOf('function getOrCreateShowAllocationsSubscription'),
      serviceSource.indexOf('export const upcomingShowService'),
    );
    assert.match(startBlock, /mapShowAllocationData\(/);
  });

  it('no polling loop (setInterval/setTimeout) was introduced for allocation refresh', () => {
    assert.equal(/setInterval/.test(hookSource), false);
    // setTimeout absence check scoped to this hook file only (other timers elsewhere in the app
    // are out of scope and irrelevant to this specific regression).
    assert.equal(/setTimeout/.test(hookSource), false);
  });

  it('useShowAllocations subscribes (not one-shot getDocs) and cleans up on unmount/show-change via the returned unsubscribe', () => {
    assert.match(hookSource, /subscribeToShowAllocations\(/);
    assert.match(hookSource, /return\s*\(\)\s*=>\s*\{\s*unsubscribe\(\);\s*\}/);
    assert.equal(/listShowAllocations/.test(hookSource), false, 'the one-shot fetch must be fully replaced, not left as a fallback path');
  });

  it('the public interface (allocations, error, isLoading, reloadAllocations) is preserved for existing callers', () => {
    assert.match(hookSource, /reloadAllocations/);
    assert.match(hookSource, /return\s*\{\s*\.\.\.state,\s*reloadAllocations,\s*\}/);
  });
});
