import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getFirestoreUsageTraceSnapshot,
  resetFirestoreUsageTraceForTests,
  runTracedCallable,
  runTracedWrite,
} from './firestoreUsageTrace';

describe('runTracedCallable', () => {
  it('records a start and a successful complete event with duration and no payload', async () => {
    resetFirestoreUsageTraceForTests({ app: 'studio', enabled: true, route: '/designs' });

    const invoke = async (request?: { id: string }) => ({ data: { ok: true, echo: request } });
    const result = await runTracedCallable('rebuildCatalogSnapshots', invoke, { id: 'secret-id' }, {
      source: 'catalogSnapshotAdminService.rebuildCatalogSnapshots',
      action: 'Rebuild catalog snapshots',
    });

    assert.deepEqual(result, { ok: true, echo: { id: 'secret-id' } });

    const snapshot = getFirestoreUsageTraceSnapshot();
    const callableEvents = snapshot.events.filter((event) => event.callableName === 'rebuildCatalogSnapshots');
    assert.equal(callableEvents.length, 2);
    assert.equal(callableEvents[0]?.kind, 'callableStart');
    assert.equal(callableEvents[1]?.kind, 'callableComplete');
    assert.equal(callableEvents[1]?.success, true);
    assert.equal(typeof callableEvents[1]?.durationMs, 'number');
    assert.equal(callableEvents[1]?.action, 'Rebuild catalog snapshots');
    assert.equal(snapshot.callables.rebuildCatalogSnapshots, 1);

    for (const event of callableEvents) {
      assert.equal(JSON.stringify(event).includes('secret-id'), false);
    }
  });

  it('records a failed complete event with an error code and rethrows', async () => {
    resetFirestoreUsageTraceForTests({ app: 'portal', enabled: true, route: '/account' });

    const invoke = async () => {
      throw Object.assign(new Error('permission denied'), { code: 'permission-denied' });
    };

    await assert.rejects(
      () => runTracedCallable('syncPortalAccountEmail', invoke, undefined, { source: 'portalAccountSettingsService' }),
      /permission denied/,
    );

    const snapshot = getFirestoreUsageTraceSnapshot();
    const completeEvent = snapshot.events.find(
      (event) => event.kind === 'callableComplete' && event.callableName === 'syncPortalAccountEmail',
    );
    assert.equal(completeEvent?.success, false);
    assert.equal(completeEvent?.errorCode, 'permission-denied');
  });
});

describe('runTracedWrite', () => {
  it('records a start and a successful complete event with a write count', async () => {
    resetFirestoreUsageTraceForTests({ app: 'studio', enabled: true, route: '/designs' });

    const run = async () => 'design-123';
    const result = await runTracedWrite(
      'updateDoc',
      run,
      { collection: 'designs', source: 'designService.updateDesign', documentPathPattern: 'designs/{designId}' },
      { writeCount: 1 },
    );

    assert.equal(result, 'design-123');

    const snapshot = getFirestoreUsageTraceSnapshot();
    const writeEvents = snapshot.events.filter((event) => event.collection === 'designs');
    assert.equal(writeEvents.length, 2);
    assert.equal(writeEvents[0]?.kind, 'writeStart');
    assert.equal(writeEvents[1]?.kind, 'writeComplete');
    assert.equal(writeEvents[1]?.success, true);
    assert.equal(writeEvents[1]?.writeCount, 1);
    assert.equal(typeof writeEvents[1]?.durationMs, 'number');
    assert.equal(Object.values(snapshot.writes).reduce((total, count) => total + count, 0), 1);
  });

  it('records a failed write with an error code and rethrows', async () => {
    resetFirestoreUsageTraceForTests({ app: 'studio', enabled: true, route: '/print-requests' });

    const run = async () => {
      throw Object.assign(new Error('write failed'), { code: 'unavailable' });
    };

    await assert.rejects(
      () =>
        runTracedWrite('setDoc', run, {
          collection: 'printRequests',
          source: 'portalPrintRequestService.createPrintRequest',
        }),
      /write failed/,
    );

    const snapshot = getFirestoreUsageTraceSnapshot();
    const completeEvent = snapshot.events.find(
      (event) => event.kind === 'writeComplete' && event.collection === 'printRequests',
    );
    assert.equal(completeEvent?.success, false);
    assert.equal(completeEvent?.errorCode, 'unavailable');
  });
});
