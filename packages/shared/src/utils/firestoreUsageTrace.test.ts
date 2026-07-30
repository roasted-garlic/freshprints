import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildFirestoreTraceSignature,
  dumpFirestoreUsageTrace,
  getFirestoreUsageTraceSnapshot,
  resetFirestoreUsageTraceForTests,
  setFirestoreUsageTraceContext,
  traceFirestoreCacheEvent,
  traceGeneratedEntryReconciliation,
  traceGeneratedCardOverride,
  traceFirestoreListenerAttach,
  traceFirestoreListenerEmission,
  traceFirestoreOneShotComplete,
  traceFirestoreOneShotStart,
  traceWrappedUnsubscribe,
} from './firestoreUsageTrace';

describe('firestoreUsageTrace', () => {
  it('is a no-op when disabled', () => {
    resetFirestoreUsageTraceForTests({ enabled: false });
    traceFirestoreListenerAttach({ collection: 'designs', source: 'catalog' });
    traceFirestoreOneShotStart('getDocs', { collection: 'designs', source: 'catalog' });
    const snapshot = getFirestoreUsageTraceSnapshot();
    assert.equal(snapshot.enabled, false);
    assert.deepEqual(snapshot.reads, {});
    assert.deepEqual(snapshot.events, []);
    assert.equal(snapshot.peakConcurrentListeners, 0);
  });

  it('builds the same signature for equivalent safe query metadata', () => {
    const left = buildFirestoreTraceSignature({
      collection: 'designs',
      constraints: ['status==ready', 'categoryId==holiday'],
      limit: 41,
      orderBy: ['updatedAt:desc', '__name__:desc'],
      source: 'left-consumer',
    });
    const right = buildFirestoreTraceSignature({
      collection: 'designs',
      constraints: ['categoryId==holiday', 'status==ready'],
      limit: 41,
      orderBy: ['updatedAt:desc', '__name__:desc'],
      source: 'right-consumer',
    });

    assert.equal(left, right);
  });

  it('records listener lifecycle, duplicate signatures, route ownership, and returned counts', () => {
    resetFirestoreUsageTraceForTests({
      app: 'studio',
      enabled: true,
      route: '/dashboard',
    });
    const query = {
      collection: 'printRequests',
      constraints: ['requestOrigin==portal_customer'],
      source: 'staffInbox.requests',
      triggerReason: 'authentication' as const,
    };

    traceFirestoreListenerAttach(query);
    traceFirestoreListenerAttach({ ...query, source: 'duplicate-consumer' });
    traceFirestoreListenerEmission(query, 22);

    const firstUnsubscribe = traceWrappedUnsubscribe(query, () => undefined);
    firstUnsubscribe();
    firstUnsubscribe();

    const snapshot = dumpFirestoreUsageTrace();
    const signature = buildFirestoreTraceSignature(query);
    assert.equal(snapshot.enabled, true);
    assert.equal(snapshot.peakConcurrentListeners, 2);
    assert.equal(snapshot.currentListeners, 1);
    assert.equal(snapshot.listenerAttaches[signature], 2);
    assert.equal(snapshot.listenerDetaches[signature], 1);
    assert.equal(snapshot.summary.duplicateActiveSignatures[signature], undefined);
    assert.equal(snapshot.summary.returnedDocuments[signature], 22);
    assert.equal(snapshot.summary.triggerReasons.authentication, 4);
    assert.ok(snapshot.events.every((event) => event.route === '/dashboard'));
  });

  it('summarizes repeated one-shot queries without storing document bodies', () => {
    resetFirestoreUsageTraceForTests({ app: 'portal', enabled: true, route: '/catalog' });
    const query = {
      collection: 'designs',
      constraints: ['status==ready'],
      limit: 41,
      orderBy: ['createdAt:desc', '__name__:desc'],
      source: 'catalogService.listReadyDesignsPage',
      triggerReason: 'route' as const,
    };

    traceFirestoreOneShotStart('getDocs', query);
    traceFirestoreOneShotComplete('getDocs', query, 41);
    traceFirestoreOneShotStart('getDocs', query);
    traceFirestoreOneShotComplete('getDocs', query, 12);
    traceFirestoreCacheEvent('cacheMiss', {
      collection: 'designs',
      source: 'catalogService.pageCache',
      triggerReason: 'route',
    });

    const snapshot = getFirestoreUsageTraceSnapshot();
    const signature = buildFirestoreTraceSignature(query);
    assert.equal(snapshot.summary.repeatedQueries[signature], 2);
    assert.equal(snapshot.summary.cacheEvents['cacheMiss:catalogService.pageCache'], 1);
    assert.equal(snapshot.summary.returnedDocuments[signature], 53);
    assert.equal(snapshot.summary.firstTimestamp !== null, true);
    assert.equal(snapshot.summary.lastTimestamp !== null, true);
    assert.ok(!JSON.stringify(snapshot).includes('customer@example.com'));
    assert.ok(!JSON.stringify(snapshot).includes('password'));
  });

  it('updates app and route context without performing trace reads', () => {
    resetFirestoreUsageTraceForTests({ enabled: true });
    setFirestoreUsageTraceContext({ app: 'portal', route: '/help' });
    traceFirestoreCacheEvent('cacheHit', {
      collection: 'settings',
      source: 'portalHelp.cache',
      triggerReason: 'route',
    });

    const snapshot = getFirestoreUsageTraceSnapshot();
    assert.equal(snapshot.events[0]?.app, 'portal');
    assert.equal(snapshot.events[0]?.route, '/help');
    assert.deepEqual(snapshot.reads, {});
  });

  it('attributes a late one-shot completion to the route where it started', () => {
    resetFirestoreUsageTraceForTests({ app: 'studio', enabled: true, route: '/designs' });
    const query = {
      collection: 'tags',
      source: 'catalogTagService.listTagPage',
      triggerReason: 'route' as const,
    };

    traceFirestoreOneShotStart('getDocs', query);
    setFirestoreUsageTraceContext({ route: '/imports' });
    traceFirestoreOneShotComplete('getDocs', query, 500);

    const snapshot = getFirestoreUsageTraceSnapshot();
    const oneShotEvents = snapshot.events.filter(
      (event) => event.kind === 'oneShotStart' || event.kind === 'oneShotComplete',
    );
    assert.equal(oneShotEvents[0]?.route, '/designs');
    assert.equal(oneShotEvents[1]?.route, '/designs');
    assert.equal(
      snapshot.summary.routeOwnership['/imports:catalogTagService.listTagPage'],
      undefined,
    );
  });

  it('groups paginated reads into one logical corpus load', () => {
    resetFirestoreUsageTraceForTests({ app: 'studio', enabled: true, route: '/designs' });
    for (const [page, returnedCount] of [[1, 500], [2, 500], [3, 122]] as const) {
      const metadata = {
        collection: 'tags',
        correlationId: 'tag-corpus-1',
        logicalOperation: 'catalogTagService.listTags',
        page,
        source: 'catalogTagService.listTagPage',
        triggerReason: 'route' as const,
      };
      traceFirestoreOneShotStart('getDocs', metadata);
      traceFirestoreOneShotComplete('getDocs', metadata, returnedCount);
    }

    const logical = getFirestoreUsageTraceSnapshot().summary.logicalOperations[
      'catalogTagService.listTags:tag-corpus-1'
    ];
    assert.deepEqual(logical, {
      logicalOperation: 'catalogTagService.listTags',
      pages: 3,
      returnedDocuments: 1122,
    });
  });

  it('uses an Electron hash route before the route context effect mounts', () => {
    const originalLocation = Object.getOwnPropertyDescriptor(globalThis, 'location');
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: { hash: '#/inbox', pathname: '/' },
    });

    try {
      resetFirestoreUsageTraceForTests({ app: 'studio', enabled: true });
      traceFirestoreListenerAttach({
        collection: 'printRequests',
        source: 'hash-route-test',
        triggerReason: 'authentication',
      });
      const snapshot = getFirestoreUsageTraceSnapshot();
      assert.equal(snapshot.events[0]?.route, '/inbox');
    } finally {
      if (originalLocation) {
        Object.defineProperty(globalThis, 'location', originalLocation);
      } else {
        Reflect.deleteProperty(globalThis, 'location');
      }
    }
  });

  it('records sanitized generated reconciliation metadata without the raw design ID', () => {
    resetFirestoreUsageTraceForTests({ app: 'studio', enabled: true, route: '/designs' });
    traceGeneratedEntryReconciliation('sensitive-design-id', {
      success: true,
      preservedSortValue: true,
      remainedVisible: true,
      cardCacheInvalidated: true,
    });

    const event = getFirestoreUsageTraceSnapshot().events[0]!;
    assert.equal(event.kind, 'generatedEntryReconciliation');
    assert.match(event.designOpaqueId ?? '', /^design-[a-f0-9]{8}$/);
    assert.notEqual(event.designOpaqueId, 'sensitive-design-id');
    assert.equal(event.preservedSortValue, true);
    assert.equal(event.remainedVisible, true);
    assert.equal(event.cardCacheInvalidated, true);
  });

  it('records sanitized session override lifecycle events', () => {
    resetFirestoreUsageTraceForTests({ app: 'studio', enabled: true, route: '/designs' });
    traceGeneratedCardOverride('applied', 'raw-design-id', 'catalog-v2');

    const event = getFirestoreUsageTraceSnapshot().events[0]!;
    assert.equal(event.kind, 'generatedCardOverride');
    assert.equal(event.overrideLifecycle, 'applied');
    assert.equal(event.contentVersion, 'catalog-v2');
    assert.notEqual(event.designOpaqueId, 'raw-design-id');
  });
});
