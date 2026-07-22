import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  dumpFirestoreUsageTrace,
  getFirestoreUsageTraceSnapshot,
  resetFirestoreUsageTraceForTests,
  traceFirestoreListenerAttach,
  traceFirestoreRead,
  traceWrappedUnsubscribe,
} from './firestoreUsageTrace';

describe('firestoreUsageTrace', () => {
  it('is a no-op when disabled', () => {
    resetFirestoreUsageTraceForTests({ enabled: false });
    traceFirestoreListenerAttach('designs:ready');
    traceFirestoreRead('getDocs', 'designs:ready');
    const snapshot = getFirestoreUsageTraceSnapshot();
    assert.equal(snapshot.enabled, false);
    assert.deepEqual(snapshot.reads, {});
    assert.equal(snapshot.peakConcurrentListeners, 0);
  });

  it('counts attaches, detaches, peak listeners, and reads by key only', () => {
    resetFirestoreUsageTraceForTests({ enabled: true });
    traceFirestoreListenerAttach('customerUploads:pending');
    traceFirestoreListenerAttach('customerUploads:pending');
    traceFirestoreRead('getDocs', 'printRequests:mine');
    traceFirestoreRead('getCountFromServer', 'designs:processing');
    assert.equal(getFirestoreUsageTraceSnapshot().peakConcurrentListeners, 2);
    assert.equal(getFirestoreUsageTraceSnapshot().currentListeners, 2);

    const unsub = traceWrappedUnsubscribe('customerUploads:pending', () => undefined);
    unsub();
    unsub();

    const snapshot = dumpFirestoreUsageTrace();
    assert.equal(snapshot.enabled, true);
    assert.equal(snapshot.listenerAttaches['customerUploads:pending'], 2);
    assert.equal(snapshot.listenerDetaches['customerUploads:pending'], 1);
    assert.equal(snapshot.currentListeners, 1);
    assert.equal(snapshot.reads['getDocs:printRequests:mine'], 1);
    assert.equal(snapshot.reads['getCountFromServer:designs:processing'], 1);
    assert.ok(!JSON.stringify(snapshot).includes('password'));
  });
});
