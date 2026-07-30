import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildFirebaseDebugReport, FIREBASE_DEBUG_ACCURACY_DISCLAIMER } from './firebaseDebugReport';
import {
  getFirestoreUsageTraceSnapshot,
  resetFirestoreUsageTraceForTests,
  setFirestoreUsageTraceContext,
  startFirebaseTraceAction,
  endFirebaseTraceAction,
  traceCallableStart,
  traceCallableComplete,
  traceFirestoreCacheEvent,
  traceFirestoreListenerAttach,
  traceFirestoreListenerEmission,
  traceFirestoreOneShotComplete,
  traceFirestoreOneShotStart,
  traceStorageAssetStart,
  traceStorageAssetComplete,
  traceFirestoreWriteStart,
  traceFirestoreWriteComplete,
} from './firestoreUsageTrace';

describe('firebaseDebugReport', () => {
  it('produces a well-formed zeroed report for an empty/disabled snapshot', () => {
    resetFirestoreUsageTraceForTests({ enabled: false });
    const snapshot = getFirestoreUsageTraceSnapshot();

    const report = buildFirebaseDebugReport(snapshot, { app: 'studio', projectId: 'fresh-prints-dev' });

    assert.equal(report.schemaVersion, 2);
    assert.equal(report.app, 'studio');
    assert.equal(report.projectId, 'fresh-prints-dev');
    assert.equal(report.session.startedAtIso, null);
    assert.equal(report.session.status, 'inactive');
    assert.equal(report.session.elapsedMs, 0);
    assert.deepEqual(report.session.routesVisited, []);
    assert.deepEqual(report.totals, {
      readOperations: 0,
      documentsReturned: 0,
      approximateBillableDocumentReads: 0,
      listenerInitialDocuments: 0,
      listenerUpdateDocuments: 0,
      writes: 0,
      listenerAttaches: 0,
      listenerEmissions: 0,
      callables: 0,
      storageAssetRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      fallbacks: 0,
      peakConcurrentListeners: 0,
      currentListeners: 0,
    });
    assert.deepEqual(report.byAction, []);
    assert.deepEqual(report.byRoute, []);
    assert.deepEqual(report.byCollection, []);
    assert.deepEqual(report.byCallable, []);
    assert.deepEqual(report.byWrite, []);
    assert.deepEqual(report.storage, []);
    assert.deepEqual(report.fallbacks, []);
    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.events, []);
  });

  it('always includes the accuracy disclaimer', () => {
    resetFirestoreUsageTraceForTests({ enabled: false });
    const disabledReport = buildFirebaseDebugReport(getFirestoreUsageTraceSnapshot(), {
      app: 'portal',
      projectId: 'fresh-prints-dev',
    });
    assert.equal(disabledReport.accuracyDisclaimer, FIREBASE_DEBUG_ACCURACY_DISCLAIMER);
    assert.ok(disabledReport.accuracyDisclaimer.length > 0);

    resetFirestoreUsageTraceForTests({ enabled: true });
    const enabledReport = buildFirebaseDebugReport(getFirestoreUsageTraceSnapshot(), {
      app: 'portal',
      projectId: 'fresh-prints-dev',
    });
    assert.equal(enabledReport.accuracyDisclaimer, FIREBASE_DEBUG_ACCURACY_DISCLAIMER);
    assert.equal(enabledReport.session.status, 'active');
  });

  it('groups a mix of reads/writes/callables/storage/fallbacks/errors across two actions and two routes', () => {
    resetFirestoreUsageTraceForTests({ app: 'studio', enabled: true, route: '/designs' });

    startFirebaseTraceAction('Save design');
    const writeMetadata = {
      collection: 'designs',
      documentPathPattern: 'designs/{designId}',
      source: 'designService.updateDesign',
      triggerReason: 'explicit-refresh' as const,
    };
    traceFirestoreWriteStart('updateDoc', writeMetadata);
    traceFirestoreWriteComplete('updateDoc', writeMetadata, { writeCount: 1 });

    traceStorageAssetStart('portal-catalog/studio/ready-index', {
      collection: undefined,
      source: 'studioCatalogAssetService.listReadyIndex',
      triggerReason: 'route',
    });
    traceStorageAssetComplete('portal-catalog/studio/ready-index', {
      source: 'studioCatalogAssetService.listReadyIndex',
      triggerReason: 'route',
    }, { cacheStatus: 'miss', contentVersion: 'v1', bytes: 1024 });
    endFirebaseTraceAction();

    setFirestoreUsageTraceContext({ route: '/imports' });
    startFirebaseTraceAction('Import designs');
    const readMetadata = {
      collection: 'tags',
      source: 'catalogTagService.listTagPage',
      triggerReason: 'route' as const,
    };
    traceFirestoreOneShotStart('getDocs', readMetadata);
    traceFirestoreOneShotComplete('getDocs', readMetadata, 12);

    traceCallableStart('rebuildCatalogSnapshotsPreview', { triggerReason: 'explicit-refresh' });
    traceCallableComplete('rebuildCatalogSnapshotsPreview', { triggerReason: 'explicit-refresh' }, {
      errorCode: 'internal',
    });

    traceFirestoreCacheEvent('cacheHit', {
      collection: 'tags',
      source: 'catalogTagService.cache',
      triggerReason: 'route',
    });
    traceFirestoreCacheEvent('fallback', {
      collection: 'tags',
      source: 'catalogTagService.cache',
      triggerReason: 'route',
      fallbackReason: 'index-missing',
    });
    endFirebaseTraceAction();

    const snapshot = getFirestoreUsageTraceSnapshot();
    const report = buildFirebaseDebugReport(snapshot, { app: 'studio', projectId: 'fresh-prints-dev' });

    assert.equal(report.totals.writes, 1);
    assert.equal(report.totals.readOperations, 1);
    assert.equal(report.totals.documentsReturned, 12);
    assert.equal(report.totals.approximateBillableDocumentReads, 12);
    assert.equal(report.totals.callables, 1);
    assert.equal(report.totals.storageAssetRequests, 1);
    assert.equal(report.totals.cacheHits, 1);
    assert.equal(report.totals.fallbacks, 1);

    const saveAction = report.byAction.find((entry) => entry.action === 'Save design');
    assert.ok(saveAction);
    assert.equal(saveAction!.writes, 1);
    assert.equal(saveAction!.storageAssetRequests, 1);
    assert.deepEqual(saveAction!.collections, ['designs']);

    const importAction = report.byAction.find((entry) => entry.action === 'Import designs');
    assert.ok(importAction);
    assert.equal(importAction!.readOperations, 1);
    assert.equal(importAction!.documentsReturned, 12);
    assert.equal(importAction!.callables, 1);

    const designsRoute = report.byRoute.find((entry) => entry.route === '/designs');
    assert.ok(designsRoute);
    assert.equal(designsRoute!.writes, 1);

    const importsRoute = report.byRoute.find((entry) => entry.route === '/imports');
    assert.ok(importsRoute);
    assert.equal(importsRoute!.readOperations, 1);
    assert.equal(importsRoute!.documentsReturned, 12);
    assert.equal(importsRoute!.callables, 1);

    const designsCollection = report.byCollection.find((entry) => entry.collection === 'designs');
    assert.ok(designsCollection);
    assert.equal(designsCollection!.writes, 1);

    const updateDocWrite = report.byWrite.find((entry) => entry.writeKind === 'updateDoc');
    assert.ok(updateDocWrite);
    assert.equal(updateDocWrite!.writeCount, 1);
    assert.equal(updateDocWrite!.successCount, 1);
    assert.equal(updateDocWrite!.failureCount, 0);
    assert.deepEqual(updateDocWrite!.collections, ['designs']);

    const tagsCollection = report.byCollection.find((entry) => entry.collection === 'tags');
    assert.ok(tagsCollection);
    assert.equal(tagsCollection!.readOperations, 1);
    assert.equal(tagsCollection!.documentsReturned, 12);

    assert.deepEqual(report.byCallable, [
      {
        callableName: 'rebuildCatalogSnapshotsPreview',
        invocationCount: 1,
        successCount: 0,
        failureCount: 1,
        averageDurationMs: null,
      },
    ]);

    const storageEntry = report.storage.find(
      (entry) => entry.assetClass === 'portal-catalog/studio/ready-index',
    );
    assert.ok(storageEntry);
    assert.equal(storageEntry!.requestCount, 1);
    assert.equal(storageEntry!.cacheMisses, 1);
    assert.deepEqual(storageEntry!.contentVersions, ['v1']);

    assert.equal(report.fallbacks.length, 1);
    assert.equal(report.fallbacks[0]!.reason, 'index-missing');

    assert.equal(report.errors.length, 1);
    assert.equal(report.errors[0]!.errorCode, 'internal');
    assert.equal(report.errors[0]!.subject, 'rebuildCatalogSnapshotsPreview');

    assert.deepEqual(report.events, snapshot.events);
  });

  it('separates operations, returned documents, minimum query charges, and listener phases', () => {
    resetFirestoreUsageTraceForTests({ app: 'studio', enabled: true, route: '/designs' });

    for (const [collection, returnedCount] of [
      ['categories', 18],
      ['tags', 500],
      ['tags', 500],
      ['tags', 122],
      ['designs', 81],
    ] as const) {
      const metadata = { collection, source: `${collection}.${returnedCount}` };
      traceFirestoreOneShotStart('getDocs', metadata);
      traceFirestoreOneShotComplete('getDocs', metadata, returnedCount);
    }

    const emptyQuery = { collection: 'empty', source: 'emptyQuery' };
    traceFirestoreOneShotStart('getDocs', emptyQuery);
    traceFirestoreOneShotComplete('getDocs', emptyQuery, 0);

    const listener = { collection: 'notifications', signature: 'notifications-active' };
    traceFirestoreListenerAttach(listener);
    traceFirestoreListenerEmission(listener, 7);
    traceFirestoreListenerEmission(listener, 2);

    const report = buildFirebaseDebugReport(getFirestoreUsageTraceSnapshot(), {
      app: 'studio',
      projectId: 'fresh-prints-dev',
    });

    assert.equal(report.totals.readOperations, 8);
    assert.equal(report.totals.documentsReturned, 1230);
    assert.equal(report.totals.approximateBillableDocumentReads, 1231);
    assert.equal(report.totals.listenerInitialDocuments, 7);
    assert.equal(report.totals.listenerUpdateDocuments, 2);

    const tags = report.byCollection.find((entry) => entry.collection === 'tags');
    assert.deepEqual(tags, {
      collection: 'tags',
      readOperations: 3,
      documentsReturned: 1122,
      approximateBillableDocumentReads: 1122,
      writes: 0,
    });
  });
});
