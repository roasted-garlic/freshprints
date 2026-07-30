import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatElapsedMs,
  formatEventAction,
  formatEventRoute,
  formatEventSubject,
  selectRecentEvents,
} from './firebaseDebugEventFormatting';
import type { FirestoreTraceEvent } from './firestoreUsageTrace';

function makeEvent(overrides: Partial<FirestoreTraceEvent> = {}): FirestoreTraceEvent {
  return {
    kind: 'oneShotStart',
    signature: 'sig',
    timestamp: new Date().toISOString(),
    triggerReason: 'route',
    elapsedMs: 0,
    ...overrides,
  };
}

describe('firebaseDebugEventFormatting', () => {
  it('formats event subject preferring collection, then callableName, then assetClass', () => {
    assert.equal(formatEventSubject(makeEvent({ collection: 'designs' })), 'designs');
    assert.equal(
      formatEventSubject(makeEvent({ collection: undefined, callableName: 'rebuildCatalogSnapshots' })),
      'rebuildCatalogSnapshots',
    );
    assert.equal(
      formatEventSubject(makeEvent({ assetClass: 'portal-catalog/studio/ready-index' })),
      'portal-catalog/studio/ready-index',
    );
    assert.equal(formatEventSubject(makeEvent()), '—');
  });

  it('formats route and action with fallbacks', () => {
    assert.equal(formatEventRoute(makeEvent({ route: '/designs' })), '/designs');
    assert.equal(formatEventRoute(makeEvent()), '—');
    assert.equal(formatEventAction(makeEvent({ action: 'Save design' })), 'Save design');
    assert.equal(formatEventAction(makeEvent()), '(unattributed)');
  });

  it('formats elapsed milliseconds across ms/s/m boundaries', () => {
    assert.equal(formatElapsedMs(250), '250ms');
    assert.equal(formatElapsedMs(1500), '1.5s');
    assert.equal(formatElapsedMs(65_000), '1m 5s');
  });

  it('selects the most recent events, newest first, bounded by limit', () => {
    const events = [1, 2, 3, 4, 5].map((index) => makeEvent({ signature: `sig-${index}` }));
    const recent = selectRecentEvents(events, 3);
    assert.deepEqual(
      recent.map((event) => event.signature),
      ['sig-5', 'sig-4', 'sig-3'],
    );
  });
});
