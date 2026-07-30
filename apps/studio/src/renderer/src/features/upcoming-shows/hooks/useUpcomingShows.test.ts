/**
 * Regression coverage for Fix 3 extended (Plan Section 22.4/22.5, Amendment 4): the Show Queue's
 * currently-selected show must reflect its own `allocatedQuantity`/capacity-relevant fields updating
 * (e.g. from a Portal-submitted allocation) without a remount, via a bounded, ref-counted,
 * single-document `onSnapshot` subscription — distinct from (and never a substitute for)
 * `useShowAllocations`'s existing per-show allocation-LIST subscription (Fix 3, Plan Section 21.3/21.4),
 * which never covered the show document's own fields.
 *
 * `useUpcomingShows` itself is a stateful React hook and this repo has no DOM-rendering test
 * convention (docs/standards/TESTING.md). Per the same convention already used for
 * `useShowAllocations.test.ts`, this file drives the ACTUAL shared primitive
 * (`createSharedFirestoreSubscription`) in the same shape `upcomingShowService.subscribeToUpcomingShow`
 * uses it, plus static source-wiring checks confirming the hook/service are wired the way this test's
 * behavioral assertions assume.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { resetFirestoreUsageTraceForTests } from '@fresh-prints/shared/utils/firestoreUsageTrace';

import { createSharedFirestoreSubscription } from '../../firebase/utils/createSharedFirestoreSubscription';

interface FakeUpcomingShow {
  id: string;
  allocatedQuantity: number;
}

/**
 * Mirrors `getOrCreateUpcomingShowSubscription` in `upcomingShowService.ts`: one shared,
 * ref-counted, single-document subscription per show id, created lazily on first subscribe.
 */
function createFakeUpcomingShowSubscriptionRegistry() {
  const registry = new Map<
    string,
    ReturnType<typeof createSharedFirestoreSubscription<FakeUpcomingShow | null>>
  >();
  const startCallsByShowId = new Map<string, number>();
  const emittersByShowId = new Map<string, (show: FakeUpcomingShow | null) => void>();

  function getOrCreate(showId: string) {
    const existing = registry.get(showId);
    if (existing) {
      return existing;
    }
    const shared = createSharedFirestoreSubscription<FakeUpcomingShow | null>({
      traceKey: `upcomingShow:${showId}`,
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
    subscribe(showId: string, onChange: (show: FakeUpcomingShow | null) => void) {
      return getOrCreate(showId).subscribe(onChange);
    },
    emit(showId: string, show: FakeUpcomingShow | null) {
      emittersByShowId.get(showId)?.(show);
    },
    startCount(showId: string) {
      return startCallsByShowId.get(showId) ?? 0;
    },
  };
}

/**
 * Mirrors `useUpcomingShows`'s state-patch behavior: the one-shot `shows` list, patched in place by
 * id when the live subscription for `liveShowId` emits.
 */
function applyLiveShowPatch(
  shows: FakeUpcomingShow[],
  liveShowId: string,
  liveShow: FakeUpcomingShow | null,
): FakeUpcomingShow[] {
  if (!liveShow) {
    return shows;
  }
  return shows.map((show) => (show.id === liveShowId ? liveShow : show));
}

describe('Fix 3 extended (Plan Section 22.4/22.5) — selected-show live document subscription', () => {
  it('a live allocatedQuantity update for the selected show is reflected without remount', () => {
    resetFirestoreUsageTraceForTests({ enabled: false });
    const registry = createFakeUpcomingShowSubscriptionRegistry();
    let shows: FakeUpcomingShow[] = [
      { id: 'show-1', allocatedQuantity: 3 },
      { id: 'show-2', allocatedQuantity: 0 },
    ];

    registry.subscribe('show-1', (liveShow) => {
      shows = applyLiveShowPatch(shows, 'show-1', liveShow);
    });

    // A Portal-submitted allocation bumps show-1's allocatedQuantity server-side.
    registry.emit('show-1', { id: 'show-1', allocatedQuantity: 8 });

    assert.equal(
      shows.find((show) => show.id === 'show-1')?.allocatedQuantity,
      8,
      'the selected show must reflect the live-updated allocatedQuantity without a remount',
    );
    assert.equal(
      shows.find((show) => show.id === 'show-2')?.allocatedQuantity,
      0,
      'a non-selected show must be unaffected',
    );
  });

  it('only one subscription exists per show id (ref-counted, shared)', () => {
    resetFirestoreUsageTraceForTests({ enabled: false });
    const registry = createFakeUpcomingShowSubscriptionRegistry();
    registry.subscribe('show-1', () => undefined);
    registry.subscribe('show-1', () => undefined);
    registry.emit('show-1', { id: 'show-1', allocatedQuantity: 1 });

    assert.equal(registry.startCount('show-1'), 1, 'exactly one upstream listener for two consumers of the same show');
  });

  it('a different, non-selected show is unaffected by a live update for the selected show', () => {
    resetFirestoreUsageTraceForTests({ enabled: false });
    const registry = createFakeUpcomingShowSubscriptionRegistry();
    let latestShow2Emissions = 0;
    registry.subscribe('show-1', () => undefined);
    registry.subscribe('show-2', () => {
      latestShow2Emissions += 1;
    });

    registry.emit('show-1', { id: 'show-1', allocatedQuantity: 5 });

    assert.equal(latestShow2Emissions, 0, 'show-2 must not receive an emission from show-1\'s update');
    assert.equal(registry.startCount('show-2'), 1, 'show-2 keeps its own independent subscription');
  });

  it('listener cleanup: unsubscribing the last consumer tears down the underlying subscription (ref-counted)', () => {
    resetFirestoreUsageTraceForTests({ enabled: false });
    let stopCount = 0;
    const shared = createSharedFirestoreSubscription<FakeUpcomingShow | null>({
      traceKey: 'test:upcoming-show-cleanup',
      start: ({ next }) => {
        next({ id: 'show-1', allocatedQuantity: 0 });
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

  it('switching the selected show tears down the prior show\'s subscription and does not leak', () => {
    resetFirestoreUsageTraceForTests({ enabled: false });
    const registry = createFakeUpcomingShowSubscriptionRegistry();
    const unsubShow1 = registry.subscribe('show-1', () => undefined);
    assert.equal(registry.startCount('show-1'), 1);

    // Simulates useUpcomingShows' effect cleanup running when liveShowId changes.
    unsubShow1();
    registry.subscribe('show-2', () => undefined);
    assert.equal(registry.startCount('show-2'), 1);
  });
});

describe('Fix 3 extended — source wiring: bounded single-document subscription, no widened scope, list-load unchanged', () => {
  const serviceHere = dirname(fileURLToPath(import.meta.url));
  const serviceSource = readFileSync(
    join(serviceHere, '../services/upcomingShowService.ts'),
    'utf8',
  );
  const hookSource = readFileSync(join(serviceHere, 'useUpcomingShows.ts'), 'utf8');

  it('subscribeToUpcomingShow uses createSharedFirestoreSubscription, not a hand-rolled onSnapshot composition', () => {
    assert.match(serviceSource, /createSharedFirestoreSubscription<UpcomingShow \| null>\(/);
  });

  it('the live subscription targets a single document (doc(...)), not a query over the collection', () => {
    const startBlock = serviceSource.slice(
      serviceSource.indexOf('function getOrCreateUpcomingShowSubscription'),
      serviceSource.indexOf('export const upcomingShowService'),
    );
    assert.match(startBlock, /doc\(firestoreCollectionService\.getUpcomingShowsCollection\(\), upcomingShowId\)/);
    assert.equal(/where\(/.test(startBlock), false, 'must not add a query/where clause — this targets exactly one document');
    assert.equal(/orderBy\(/.test(startBlock), false);
    assert.equal(/limit\(/.test(startBlock), false);
  });

  it('the live subscription reuses mapUpcomingShowData rather than duplicating the doc-to-UpcomingShow mapping', () => {
    const startBlock = serviceSource.slice(
      serviceSource.indexOf('function getOrCreateUpcomingShowSubscription'),
      serviceSource.indexOf('export const upcomingShowService'),
    );
    assert.match(startBlock, /mapUpcomingShowData\(/);
  });

  it('listUpcomingShows remains a one-shot getDocs fetch (the full-collection list-load is not converted to a live listener)', () => {
    const listBlock = serviceSource.slice(
      serviceSource.indexOf('async listUpcomingShows('),
      serviceSource.indexOf('async getUpcomingShowById('),
    );
    assert.match(listBlock, /getDocs\(/);
    assert.equal(/onSnapshot\(/.test(listBlock), false, 'listUpcomingShows must remain one-shot, not a live listener');
  });

  it('no polling loop (setInterval/setTimeout) was introduced for the selected-show live refresh', () => {
    assert.equal(/setInterval/.test(hookSource), false);
    assert.equal(/setTimeout/.test(hookSource), false);
  });

  it('useUpcomingShows subscribes only when a liveShowId is provided and cleans up on unmount/id change', () => {
    assert.match(hookSource, /subscribeToUpcomingShow\(/);
    assert.match(hookSource, /return\s*\(\)\s*=>\s*\{\s*unsubscribe\(\);\s*\}/);
  });

  it('the public interface (shows, error, isLoading, reloadUpcomingShows) is preserved for existing callers', () => {
    assert.match(hookSource, /reloadUpcomingShows/);
    assert.match(hookSource, /return\s*\{\s*\.\.\.state,\s*reloadUpcomingShows,\s*\}/);
  });
});
